import { createId } from "~/db/id";
import { events } from "~/db/schema";
import {
  corsJson,
  corsNoContent,
  originAllowed,
  preflight,
  serverError,
} from "~/modules/ingest/cors.server";
import { country } from "~/modules/ingest/geo.server";
import { getWebsite } from "~/modules/websites/queries.server";
import { db } from "~/shared/lib/db.server";
import { rateLimit } from "~/modules/ingest/ratelimit.server";
import { acquisition, urlHost } from "~/modules/ingest/referrer.server";
import { isBot, parseUserAgent, screenClass } from "~/modules/ingest/ua.server";
import {
  SESSION_WINDOW_MS,
  clientKey,
  visitorId,
} from "~/modules/ingest/visitor.server";
import { and, desc, eq, sql } from "drizzle-orm";
import localeCodes from "locale-codes";
import { z } from "zod";
import type { Route } from "./+types/collect";

/**
 * Postgres cannot hold either of these, and the endpoint is unauthenticated.
 *
 * `text` rejects U+0000 outright (22021) and `jsonb` rejects both U+0000
 * (22P05) and an unpaired UTF-16 surrogate (22P02) — the latter because
 * JSON.stringify faithfully emits `\ud800` for one. `"\u0000"` is legal JSON, so
 * it passes JSON.parse and every zod check, and none of those SQLSTATEs is
 * 23505, so all three used to escape the duplicate-token catch below and 500
 * the route with the whole INSERT in the log. All four cases were reproduced
 * against pg 16.
 *
 * Repaired rather than rejected. A NUL is never the meaningful part of a path
 * or a prop, and a lone surrogate is what `label.slice(0, 32)` leaves behind
 * when it cuts an emoji in half — an ordinary bug on a customer's page, not an
 * attack, and dropping the whole beacon for it would lose a real pageview.
 * U+FFFD is exactly what Node's UTF-8 encoder already substitutes on the way to
 * a `text` column, so this only makes `jsonb` agree with the columns beside it.
 */
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export const storable = (value: string) =>
  value.replaceAll("\u0000", "").replace(LONE_SURROGATE, "\uFFFD");

/**
 * Zod's `.max()` counts UTF-16 code units, so a 1024-character multibyte string
 * passes it and then breaks a byte-sized limit downstream — btree refuses an
 * index tuple over ~2704 bytes, and by then the ingest transaction is already
 * open. Bound the bytes the database will actually be handed, after repairing
 * the characters it cannot hold at all: every client string in this file goes
 * through here, which is the only way both rules apply to all of them.
 */
export const bounded = (max: number) =>
  z
    .string()
    .transform(storable)
    .refine((value) => Buffer.byteLength(value, "utf8") <= max, {
      message: "Value is too long",
    });

/**
 * Normalising the path is the tracker's job, but it arrives from an
 * unauthenticated client on somebody else's page: one stray `?utm_source=` or
 * `#section` splits a single page into a row per campaign and per anchor, and
 * the breakdown that results is unrecoverable after the fact.
 *
 * A fragment is kept when — and only when — it is shaped like a route, meaning
 * it starts with `#/`. That is the convention every hash router writes: Vue
 * Router's hash mode, Angular's HashLocationStrategy, `createHashRouter`, and
 * any static host that cannot serve a rewrite. Collapsing it gave those apps one
 * row per site, always `/`, one pageview per document however deep the visit
 * went, and — because the bounce clear needs a second pageview — a bounce on
 * every single visit.
 *
 * Nothing looser than `#/`, because a fragment is where the web puts secrets.
 * An OAuth implicit-flow or magic-link callback lands as
 * `#access_token=…&refresh_token=…`, and this column is unbounded text rendered
 * in a dashboard panel; `#pricing` and `#comment-1234` are meanwhile positions
 * inside one page, and counting them would split that page into a row per
 * anchor. Both keep collapsing exactly as they did.
 *
 * The route itself ends at the first `?`, `&` or `#`. `?` is where a hash router
 * puts its search params, so `#/orders?page=2` is one page. The other two are
 * how a secret gets past the `#/` test: a redirect URI that already carries a
 * fragment is undefined territory in RFC 6749 and providers resolve it by
 * appending, so `#/callback&access_token=…` and `#/callback#access_token=…` are
 * both shapes a hash-routed app's OAuth callback really lands on. A route
 * segment holding a literal `&` is truncated as the price of that.
 *
 * The byte bound is unchanged and still runs first: `bounded` measures the value
 * as it arrived, and everything here only ever removes from it.
 */
const path = bounded(1024)
  .pipe(z.string().min(1))
  .transform((value) => {
    const cut = value.indexOf("#");
    const fragment = cut === -1 ? "" : value.slice(cut);
    const [pathname = ""] = (cut === -1 ? value : value.slice(0, cut)).split(
      "?"
    );
    // Sliced past the `#` before splitting, or the leading one is the first
    // separator and takes the whole route with it.
    const [route = ""] = fragment.startsWith("#/")
      ? fragment.slice(1).split(/[?&#]/)
      : [];
    const rooted = pathname.startsWith("/") ? pathname : `/${pathname}`;

    return route ? `${rooted}#${route}` : rooted;
  });

/** Blank is how the tracker spells "this parameter was not in the URL". */
const param = bounded(255)
  .nullish()
  .transform((value) => value?.trim() || null);

/**
 * Custom event properties, bounded on every axis. The column is jsonb and the
 * endpoint is unauthenticated, so without these a single beacon could park a
 * document in the events table; scalars only, because a nested value has no
 * meaning in a breakdown anyway.
 */
const props = z
  .record(
    bounded(64),
    z.union([bounded(512), z.number().finite(), z.boolean()])
  )
  .refine((value) => Object.keys(value).length <= 24, {
    message: "Too many properties",
  });

/**
 * `numeric(14, 2)` overflows above this, and an overflow arrives as a 22003
 * that aborts the transaction — a client-supplied number gets to be rejected,
 * not to 500 the endpoint. Negatives are allowed: a refund is revenue too.
 */
const AMOUNT = 999_999_999_999.99;

const revenue = z.object({
  amount: z.number().finite().min(-AMOUNT).max(AMOUNT),
  // ISO-4217, uppercased here so `eur` and `EUR` are not two currencies.
  currency: z
    .string()
    .regex(/^[a-z]{3}$/i, "Invalid currency")
    .transform((value) => value.toUpperCase()),
});

/**
 * A cuid2 from `~/db/id` is 25 characters, so nothing longer can name a
 * website. Bound anyway, and by bytes like everything else: this value is fed
 * to `getWebsite` on an unauthenticated path, and a `wid` of two million
 * characters is a query parameter and a log line before it is a 404.
 */
const wid = bounded(32).pipe(z.string().min(1));

/** What the tracker posts on every pageview and every `aurora()` call. */
export const collectSchema = z
  .object({
    wid,
    /**
     * Lowercase, and the check constraint means it: the old tracker sent
     * `pageView`, which now fails the insert outright instead of quietly
     * matching zero rows in every panel the way it used to.
     */
    type: z.enum(["pageview", "event"]),
    name: bounded(200).optional(),
    // Stored as `view_token` and part of a unique btree key, hence the bound.
    vid: bounded(64).pipe(z.string().min(1)),
    path,
    /**
     * A pageview that repairs the path of the one `vid` already named, rather
     * than a second pageview. The tracker sends it when a router replaced the
     * URL while the route it had just announced was still settling — a mount
     * redirect: an auth guard, a locale prefix, a boot rewrite.
     *
     * It is a flag and not a second endpoint because it is the same beacon with
     * the same bounds, and because the tracker must be able to decide between
     * the two after it has already sent the pageview.
     */
    corrects: z.boolean().optional(),
    referrer: bounded(1024).optional(),
    language: bounded(64).optional(),
    screen: z.number().finite().optional(),
    /**
     * `navigator.userAgentData.getHighEntropyValues(["platformVersion"])`, read
     * by the tracker and posted here because the header carrying the same value
     * cannot reach this route: a browser stores an `Accept-CH` ask only from a
     * top-level navigation response, and this origin serves nothing but beacons.
     *
     * Additive and optional, so a tracker that predates it — or any browser
     * without `userAgentData`, which is every non-Chromium one — is accepted
     * unchanged and falls back to the headers exactly as before.
     *
     * Absent on a document's *first* pageview even where the browser has an
     * answer, and that is the tracker's deliberate trade rather than a gap here:
     * `getHighEntropyValues` resolves a task later than the view it would ride
     * on, and the first view is the one a fast bounce depends on. So a
     * one-pageview visit keeps the frozen fallback, one session can hold two
     * `os_version` values, and neither is a defect this route can see. Stated
     * here because this is where the field's contract lives — a reader
     * comparing the column against the panel is entitled to know which rows
     * carry the repaired value.
     *
     * Attacker-controlled like every other string in this body, hence the same
     * byte bound. "10.0.19045.2846" is the widest real answer at 15 bytes; the
     * server reduces whatever arrives to a major, or on Windows to the release
     * that major names, and drops anything that is not digits.
     */
    platformVersion: bounded(32).optional(),
    // Accepted so a tracker that reports it is not rejected; there is no column
    // for it, because `screen_class` is the question a layout change asks.
    viewport: z.number().finite().optional(),
    utm: z
      .object({
        source: param,
        medium: param,
        campaign: param,
        term: param,
        content: param,
      })
      .optional(),
    props: props.optional(),
    revenue: revenue.optional(),
  })
  .refine((payload) => payload.type !== "event" || Boolean(payload.name), {
    message: "A custom event needs a name",
    path: ["name"],
  });

/**
 * Every bound above added up, with room to spare: 24 props of 64 + 512 bytes is
 * ~14KB, plus a 1024 byte path, a 1024 byte referrer, five 255 byte utm values
 * and the JSON syntax around them comes to roughly 18KB, so a payload this
 * endpoint would actually accept always fits.
 *
 * The *read* has to be bounded rather than the parse. Every byte-bounded
 * validator above defends the btree and none of them defends the heap: they run
 * after the body is already in memory, and `request.text()` had no cap at all.
 * Nothing upstream supplies one either — `@react-router/serve` mounts
 * compression, express.static and morgan around the handler and no body parser
 * — so one unauthenticated POST could buffer as much as it liked. Content-Length
 * is checked first and the stream is capped regardless, because a chunked
 * request declares no length.
 */
const MAX_BODY_BYTES = 32 * 1024;

/** `null` for a body that was too large, unreadable, or not JSON — one 422. */
export async function readPayload(
  request: Request
): Promise<{ payload: unknown } | null> {
  const declared = request.headers.get("content-length");

  if (declared !== null && Number(declared) > MAX_BODY_BYTES) {
    return null;
  }

  if (!request.body) {
    return null;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    size += value.byteLength;

    if (size > MAX_BODY_BYTES) {
      await reader.cancel();

      return null;
    }

    chunks.push(value);
  }

  try {
    // sendBeacon posts text/plain, so the content type is evidence of nothing
    // and the body is parsed rather than negotiated.
    return { payload: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return null;
  }
}

/**
 * locale-codes types `getByTag` as total; it returns undefined for a tag it
 * does not know, which is most of what a `navigator.language` can hold. Only a
 * recognised tag is stored, so the column is canonical BCP-47 rather than
 * whatever spelling the browser happened to use.
 *
 * Deliberately not exported. A route module's non-route exports survive into the
 * client build, and exporting this one pulled the whole 156KB locale-codes table
 * into the browser chunk for a function only `action` ever calls.
 */
function localeTag(language: string | undefined): string | null {
  if (!language) {
    return null;
  }

  return localeCodes.getByTag(language)?.tag ?? null;
}

/**
 * pg reports a unique violation as 23505, and drizzle wraps it in a
 * DrizzleQueryError, so the code is one `cause` down — two once a transaction
 * has rethrown it.
 */
function isUniqueViolation(error: unknown): boolean {
  for (let cause = error, depth = 0; depth < 4; depth += 1) {
    if (typeof cause !== "object" || cause === null) {
      return false;
    }

    if ((cause as { code?: unknown }).code === "23505") {
      return true;
    }

    cause = (cause as { cause?: unknown }).cause;
  }

  return false;
}

export async function loader({ request }: Route.LoaderArgs) {
  const origin = request.headers.get("origin");

  // React Router dispatches by method and only POST/PUT/PATCH/DELETE reach an
  // action, so every preflight this route ever answers arrives here.
  if (request.method === "OPTIONS") {
    return preflight(origin);
  }

  return corsJson({ message: "Method not allowed" }, 405, origin);
}

export async function action({ request }: Route.ActionArgs) {
  const origin = request.headers.get("origin");

  if (request.method !== "POST") {
    return corsJson({ message: "Method not allowed" }, 405, origin);
  }

  // Answered before the body is even read. At the volume a well-indexed site
  // attracts, this is the difference between a traffic chart and a crawl log,
  // and there is nothing in the payload worth spending a parse on first.
  if (isBot(request.headers.get("user-agent"))) {
    return corsNoContent(origin);
  }

  /**
   * A page nobody has looked at yet is not a pageview, and the server has to be
   * able to say so on its own.
   *
   * The shipped tracker already refuses to send while `document.prerendering` is
   * true, so in a matched pair no beacon arrives from a prerender at all — but
   * that is the client half of the rule, and it is the half that goes stale. A
   * tracker.js cached before that check existed, a hand-rolled integration, or a
   * non-Chromium speculative fetch all reach this route with a real pageview to
   * write and nothing here to stop them.
   *
   * `Sec-Purpose` is the header the browser sets on every request a
   * prerendering document makes, `prefetch;prerender` for a prerender and
   * `prefetch` for a plain prefetch. Only the prerender half is matched: a
   * prefetch retrieves a document without running its scripts, so it cannot
   * produce a beacon in the first place, and matching it would only add a way
   * to lose a real one. The `Sec-` prefix makes it a forbidden header name, so
   * script cannot set or clear it — this is one of the few claims a browser
   * makes that an unauthenticated caller genuinely cannot forge.
   */
  if (request.headers.get("sec-purpose")?.includes("prerender")) {
    return corsNoContent(origin);
  }

  /**
   * Before the body and before the website lookup: the limiter is what keeps a
   * flood off the database, which it cannot do from behind a query, and what
   * bounds the bytes a single caller can make this process buffer.
   *
   * The key is `clientKey()` and nothing out of the payload. It used to be
   * `${ip}:${wid}`, with `wid` taken from the unvalidated body — so a caller
   * who changed one character got a brand-new full bucket, and 1000 requests
   * from one address produced 1000 buckets, 1000 database queries and zero
   * 429s.
   */
  const limit = rateLimit(clientKey(request.headers));

  if (!limit.allowed) {
    const response = corsJson({ message: "Too many requests" }, 429, origin);

    response.headers.set(
      "Retry-After",
      String(Math.ceil(limit.retryAfterMs / 1000))
    );

    return response;
  }

  const body = await readPayload(request);

  if (!body) {
    return corsJson({ message: "Invalid payload" }, 422, origin);
  }

  const parsed = collectSchema.safeParse(body.payload);

  if (!parsed.success) {
    return corsJson({ message: parsed.error.issues[0].message }, 422, origin);
  }

  const payload = parsed.data;
  const website = await getWebsite(payload.wid);

  if (!website) {
    return corsJson({ message: "Not found" }, 404, origin);
  }

  if (origin && !originAllowed(origin, website.url)) {
    return corsJson({ message: "Forbidden" }, 403, origin);
  }

  const isPageview = payload.type === "pageview";

  /**
   * A correction moves an existing pageview's path; it is not a visit.
   *
   * Everything sessionization does below is therefore skipped outright — no
   * advisory lock, no previous-pageview lookup, no bounce clear, no insert —
   * because a mount redirect is one arrival and the row this repairs is already
   * holding that arrival's session, its bounce flag and its acquisition. That
   * is the entire point of correcting rather than inserting: the second beacon
   * a redirect used to produce cleared the bounce of the visit it belonged to,
   * so a site that rewrites its URL on mount reported a structural bounce rate
   * of zero.
   *
   * `type` is named for the same reason as in the duration route: the unique
   * index over `view_token` is partial on `type = 'pageview'`, and Postgres
   * only uses a partial index when the query's own quals imply the predicate.
   * `path` is in no index, so this stays a HOT update.
   *
   * 204 whether or not a row matched, again like the duration beacon. The row
   * may not exist yet — two beacons a few dozen milliseconds apart can arrive
   * out of order — and in that case the pageview keeps the pre-redirect path,
   * which is the outcome this endpoint had before corrections existed.
   */
  if (isPageview && payload.corrects) {
    try {
      await db
        .update(events)
        .set({ path: payload.path })
        .where(
          and(
            eq(events.website_id, website.id),
            eq(events.view_token, payload.vid),
            eq(events.type, "pageview")
          )
        );
    } catch (error) {
      return serverError(error, origin);
    }

    return corsNoContent(origin);
  }

  const visitor = visitorId(request.headers, website.id);
  const locale = localeTag(payload.language);
  const now = Date.now();

  /** Where this beacon says the visit came from, as the seven columns hold it. */
  const arrival = {
    ...acquisition({
      referrer: payload.referrer,
      siteUrl: website.url,
      utm: payload.utm,
    }),
    utm_source: payload.utm?.source ?? null,
    utm_medium: payload.utm?.medium ?? null,
    utm_campaign: payload.utm?.campaign ?? null,
    utm_term: payload.utm?.term ?? null,
    utm_content: payload.utm?.content ?? null,
  };

  /**
   * The referrer was a page of this same site, which `acquisition` nulled as a
   * self-referral — so `direct` here means the reader was already inside rather
   * than that they arrived from nowhere. Both halves are load-bearing: a beacon
   * with no referrer at all is direct too and is a real arrival, and a utm makes
   * the view a campaign whatever host delivered it.
   */
  const internal =
    arrival.channel === "direct" && urlHost(payload.referrer) !== null;

  try {
    await db.transaction(async (tx) => {
      /**
       * Sessionization is a read, a decision and a write with no lock between
       * them, at the READ COMMITTED the driver's bare `begin` inherits. Two
       * concurrent pageviews from one visitor therefore both saw no previous
       * row, both minted a session, and both wrote is_new_session and
       * is_a_bounce — sessions doubled, bounce rate went to 100% where the
       * truth was 0%, and the average visit time halved with it. Nothing heals
       * it afterwards: the bounce clear is scoped to the session the *other*
       * transaction chose. Reproduced on pg 16 against the real table, and
       * confirmed a genuine write skew by the fact that the same pair aborts
       * with 40001 at SERIALIZABLE.
       *
       * Not exotic traffic, either. `visitor_id` is an HMAC over the address
       * and the user agent, so everyone behind one CGNAT egress running the
       * same browser build is one visitor, and a restored tab set or a burst of
       * prefetches is two concurrent pageviews for them.
       *
       * An advisory lock rather than SERIALIZABLE or a unique constraint: it
       * needs no retry plumbing on the ingest path, it costs no I/O, its
       * granularity is exactly the visitor whose session is being decided, and
       * it releases at COMMIT.
       */
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${website.id}:${visitor}`}, 0))`
      );

      /**
       * The visitor's most recent *pageview*, not their most recent event.
       *
       * Sessions are made of pageviews: a custom event joins whatever session
       * is open and must neither open one nor keep one alive. Reading the last
       * event of any type did both. An `aurora()` call arriving before a
       * visitor's first pageview minted a session, and the pageview two seconds
       * later then found it and wrote is_new_visitor, is_new_session and
       * is_a_bounce all false — a one-page visit that never counted as a
       * bounce, and a visitor who never counted as new. In the other direction
       * a heartbeat event on a timer refreshed the 30-minute window forever, so
       * a site firing scroll-depth pings reported one session per visitor per
       * day.
       *
       * `ORDER BY created_at DESC LIMIT 1` and nothing else: the
       * (website_id, visitor_id, created_at DESC) index turns this into a
       * one-row backwards walk with no sort, and it runs on every ingest, so
       * any spelling the planner cannot match is a sort on the write path. The
       * `type` qual is a filter on that same scan rather than an access-path
       * change — measured on 40k rows it is the same plan, the same index and
       * the same four buffers.
       */
      const [previous] = await tx
        .select({
          session_id: events.session_id,
          created_at: events.created_at,
        })
        .from(events)
        .where(
          and(
            eq(events.website_id, website.id),
            eq(events.visitor_id, visitor),
            eq(events.type, "pageview")
          )
        )
        .orderBy(desc(events.created_at))
        .limit(1);

      const live =
        previous !== undefined &&
        now - previous.created_at.getTime() < SESSION_WINDOW_MS;
      const session = live ? previous.session_id : createId();

      /**
       * A session that restarts mid-visit is not a second acquisition.
       *
       * The 30-minute rule fires on someone who left the tab open and came
       * back, and the pageview that reopens their session carries the site's
       * own previous page as its referrer. That is nulled as a self-referral,
       * so the row went in as `direct` and the acquisition panels — which count
       * exactly these `is_new_session` rows — read a resumed visit as an
       * arrival nobody could attribute. Direct absorbed every channel's
       * long-dwell traffic, and every other channel's share was understated by
       * however long its visitors leave tabs open.
       *
       * The self-referral is the evidence and the only trigger: the reader was
       * demonstrably already on the site, so the visit this session continues
       * is the one that acquired them, and its opening pageview is where that
       * answer is stored. A restart that genuinely re-arrived — typed, from a
       * bookmark, from a search — carries no referrer or an external one and
       * keeps its own, which is why this cannot swallow a real arrival.
       *
       * One indexed row on (website_id, session_id), read only when a session
       * actually restarts, never on the live-session path every other pageview
       * takes. It reaches no further back than today either: the lookup above
       * is keyed on `visitor_id`, which is an HMAC over the UTC date.
       *
       * Which is also why the midnight restart cannot be repaired here. At
       * 00:00 UTC the id rotates, that lookup finds nothing, and there is no
       * previous session to carry anything from; reaching for yesterday's id
       * would write the link between the two into `session_id`, which is the
       * correlation the daily rotation exists to prevent. Those restarts stay
       * in Direct, and the Sources hint says so.
       */
      const [carried] =
        isPageview && !live && internal && previous !== undefined
          ? await tx
              .select({
                referrer_host: events.referrer_host,
                channel: events.channel,
                utm_source: events.utm_source,
                utm_medium: events.utm_medium,
                utm_campaign: events.utm_campaign,
                utm_term: events.utm_term,
                utm_content: events.utm_content,
              })
              .from(events)
              .where(
                and(
                  eq(events.website_id, website.id),
                  eq(events.session_id, previous.session_id),
                  // The flag ingest sets on a session's opening pageview and
                  // nowhere else, which is the one row of it holding an answer:
                  // every later view of that session was a self-referral too.
                  eq(events.is_new_session, true),
                  eq(events.type, "pageview")
                )
              )
              .limit(1)
          : [];

      /**
       * A second view retroactively clears the session's bounce. The two extra
       * quals are not tidying: only the session's first pageview can hold the
       * flag, and without them this statement rewrites every earlier row of the
       * session on every view — 1225 row versions for a 50-view session.
       */
      if (isPageview && live) {
        await tx
          .update(events)
          .set({ is_a_bounce: false })
          .where(
            and(
              eq(events.website_id, website.id),
              eq(events.session_id, session),
              eq(events.is_a_bounce, true),
              eq(events.type, "pageview")
            )
          );
      }

      await tx.insert(events).values({
        website_id: website.id,
        type: payload.type,
        name: isPageview ? null : (payload.name ?? null),
        path: payload.path,
        // Only a pageview can be the target of a duration beacon, and the
        // partial unique index holds that implication rather than trusting this
        // line to keep remembering it.
        view_token: isPageview ? payload.vid : null,
        visitor_id: visitor,
        session_id: session,
        /**
         * A custom event joins whatever session is open but never opens one and
         * never carries a first-ness: these three flags are what the dashboard
         * counts as visitors, sessions and bounces, and an `aurora()` call is
         * not a visit. `session_id` is NOT NULL, so an event with no open
         * session still gets an id; with all three flags false and every
         * headline figure scoped to `type = 'pageview'`, that session is
         * counted nowhere.
         */
        is_new_visitor: isPageview && previous === undefined,
        is_new_session: isPageview && !live,
        is_a_bounce: isPageview && !live,
        // All seven together or none of them: a channel of `campaign` beside
        // five null utm columns is how a breakdown goes quietly empty, and the
        // carried answer has to arrive as one row for the same reason.
        ...(carried ?? arrival),
        ...parseUserAgent(request.headers, payload.platformVersion),
        screen_class: screenClass(payload.screen),
        country: country(request.headers),
        locale,
        props: payload.props ?? null,
        revenue: payload.revenue?.amount ?? null,
        currency: payload.revenue?.currency ?? null,
      });
    });
  } catch (error) {
    /**
     * A replayed beacon for a view already recorded is a duplicate, not a
     * failure. The token comes from an unauthenticated client that retries on
     * unload paths it cannot observe, so the honest answer is the same 204 the
     * first delivery got — a 500 would only teach it to retry harder.
     */
    if (!isUniqueViolation(error)) {
      return serverError(error, origin);
    }
  }

  return corsNoContent(origin);
}
