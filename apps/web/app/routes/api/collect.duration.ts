import { events } from "~/db/schema";
import {
  corsJson,
  corsNoContent,
  originAllowed,
  preflight,
  serverError,
} from "~/modules/ingest/cors.server";
import { getWebsite } from "~/modules/websites/queries.server";
import { db } from "~/shared/lib/db.server";
import { rateLimit } from "~/modules/ingest/ratelimit.server";
import { clientKey } from "~/modules/ingest/visitor.server";
import { and, eq, sql } from "drizzle-orm";
import { durationSchema, readPayload } from "~/modules/ingest/payload.server";
import type { Route } from "./+types/collect.duration";

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

  // Shares /collect's budget: this route writes to the same table from the same
  // unauthenticated caller, and an UPDATE generator is not cheaper than an
  // INSERT generator. Taken before the body is read, for the same reason.
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

  const parsed = durationSchema.safeParse(body.payload);

  if (!parsed.success) {
    return corsJson({ message: parsed.error.issues[0].message }, 422, origin);
  }

  const { wid, vid, duration } = parsed.data;
  const website = await getWebsite(wid);

  if (!website) {
    return corsJson({ message: "Not found" }, 404, origin);
  }

  if (origin && !originAllowed(origin, website.url)) {
    return corsJson({ message: "Forbidden" }, 403, origin);
  }

  try {
    /**
     * `type` is named even though only pageviews ever carry a token: the unique
     * index is partial over `view_token IS NOT NULL AND type = 'pageview'`, and
     * Postgres will only use a partial index when the query's own quals imply
     * the predicate. `view_token = $2` implies the first half; nothing implies
     * the second, so without this the lookup falls back to a scan.
     *
     * `greatest` and not a plain SET, because two beacons for one view are not
     * an ordered transport. The tracker's accumulator only ever grows — it
     * reports the running total for the view and returns early when that total
     * has not moved — so a value smaller than the stored one is always a stale
     * delivery, never a correction. sendBeacon and keepalive-fetch are
     * independent requests, so `visibilitychange` at 20s and `pagehide` at 120s
     * can arrive in either order; under a plain SET the 20s one landing second
     * wrote 20s over the truth and the tile reported it. A replayed older beacon
     * did the same. `coalesce` is what makes the first beacon for a view win
     * against the NULL the row was inserted with, and `duration` is in no index,
     * so this stays a HOT update exactly as before.
     */
    await db
      .update(events)
      .set({
        duration: sql`greatest(coalesce(${events.duration}, 0), ${duration})`,
      })
      .where(
        and(
          eq(events.website_id, website.id),
          eq(events.view_token, vid),
          eq(events.type, "pageview")
        )
      );
  } catch (error) {
    // Same discipline as /collect: an uncaught error here leaves the route
    // without a single CORS header and, outside a production server mode,
    // answers a third-party origin with drizzle's `Failed query: <sql> params:
    // <values>`. There is no duplicate to swallow on an UPDATE, so every error
    // is a 500 — just this route's own 500.
    return serverError(error, origin);
  }

  /**
   * 204 whether or not a row matched. The token is ephemeral and the beacon
   * fires during unload, where no status is ever read; answering "no such
   * token" would only tell an unauthenticated caller which tokens exist.
   */
  return corsNoContent(origin);
}
