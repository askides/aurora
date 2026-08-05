import { z } from "zod";

/**
 * What a beacon's body is allowed to be, before anything reads what it means.
 *
 * Extracted from routes/api/collect.ts, for two reasons that turned out to be
 * the same one. The duration endpoint needed `bounded` and `readPayload` and
 * was importing them from the other route file — the only route-to-route edge
 * in the graph. And a route module's non-route exports survive into the client
 * build, so a schema exported from the route is a schema in the browser bundle;
 * React Router only strips `loader`, `action`, `middleware` and `headers`. With
 * both schemas here the two routes export nothing but those, which is what lets
 * this module be `.server` at all.
 */

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
/** One day, matching the events_duration_range check. */
const MAX_DURATION = 86_400_000;

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
 * The unload beacon that reports how long a view lasted.
 *
 * It names the view by the tracker's own ephemeral token rather than by an
 * event id, which is the whole reason the id never leaves the server: a token
 * is meaningless the moment the page is gone, an id is a row anyone could then
 * write to. The bounds matter for the same reason the endpoint is
 * unauthenticated — without them one beacon skews a site's average visit time
 * permanently.
 *
 * `bounded` is shared with /collect rather than restated: it strips the NUL
 * that Postgres refuses even in a `text` comparison, and a `vid` carrying one
 * used to throw 22021 straight out of the UPDATE below.
 */
export const durationSchema = z.object({
  // A cuid2 website id is 25 characters; a stored token is at most 64 bytes, so
  // nothing longer than either can match anything.
  wid: bounded(32).pipe(z.string().min(1)),
  vid: bounded(64).pipe(z.string().min(1)),
  duration: z.number().min(0).max(MAX_DURATION),
});
