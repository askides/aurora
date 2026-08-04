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
import { collectSchema, readPayload } from "~/modules/ingest/payload.server";
import { db } from "~/shared/lib/db.server";
import { isUniqueViolation } from "~/shared/lib/pg-errors.server";
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
import type { Route } from "./+types/collect";

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
