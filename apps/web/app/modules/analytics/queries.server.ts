import { events, type EventType } from "~/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "~/shared/lib/db.server";
import { assertTimeseriesUnit, isValidTimeZone } from "./timezone";
import type { Breakdown, Breakdowns, Statistics, TimeseriesRow } from "./types";

export type DateFilters = {
  start?: string | number | null;
  end?: string | number | null;
};

/**
 * A bound as an instant, or null when there isn't one.
 *
 * Not `Number(value)` behind a truthiness test: `0` is a real epoch
 * millisecond and a falsy JS number, so testing the raw value dropped the
 * predicate rather than applying it. `?from=-1000&to=0` therefore asked for one
 * second of 1970 and got the site's lifetime totals — on the public dashboard,
 * an anonymous read straight past the loader's documented span cap.
 *
 * A bound that is present but unreadable throws instead of returning null for
 * the same reason: silently widening a window is the one failure mode here that
 * nobody can see from the outside.
 */
function instant(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const ms = Number(value);

  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return new Date(ms);
}

/**
 * Range predicate shared by every metric query, half-open: `>= start`, `< end`.
 *
 * Both ends used to be inclusive, which made the boundary instant a member of
 * two windows — `resolveFilters` anchors the comparison window at
 * `previous.end === from === current.start`, so an event landing exactly on it
 * was counted in both and the trend arrow was computed from overlapping sets.
 * Half-open is also what lets consecutive windows tile the timeline with no gap
 * and no double count, which a `previous.end = from - 1` patch would not.
 */
function withinRange({ start, end }: DateFilters) {
  const from = instant(start);
  const to = instant(end);

  return [
    from ? gte(events.created_at, from) : undefined,
    to ? lt(events.created_at, to) : undefined,
  ].filter(Boolean);
}

/**
 * An IANA zone *name*, and not an offset.
 *
 * `Intl` accepts `+05:30` as a time zone and reads it as UTC+5:30. Postgres
 * accepts it too and reads it as UTC-5:30, because a bare numeric zone is POSIX
 * and POSIX signs them the other way round. Nothing downstream can reconcile
 * that, so the two sides only ever agree on a name — and a name is all the
 * picker offers and all `Intl.DateTimeFormat().resolvedOptions().timeZone`
 * returns on any runtime the browser matrix contains.
 *
 * `Etc/GMT+5` is deliberately still allowed: it is a zone name, and both sides
 * read it the same (POSIX) way.
 */
const ZONE_NAME = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/;

export function isZoneName(tz: string) {
  return ZONE_NAME.test(tz) && isValidTimeZone(tz);
}

export function assertZoneName(tz: string) {
  if (!isZoneName(tz)) {
    throw new Error(`Invalid time zone: ${tz}`);
  }

  return tz;
}

/**
 * `type` is named by every metric query, never left implicit.
 *
 * The dashboard index is (website_id, type, created_at) with type in the
 * middle, and Postgres 16 has no skip scan: leaving the qual out does not cost
 * a little, it demotes type to a heap filter that reads and discards every
 * custom event in the window — sixteen times, once per query a render fires.
 * It is also the difference between "pageviews" and "pageviews plus whatever
 * the site's own `aurora()` calls happen to fire", which is the number the
 * headline tile claims to be showing.
 */
const scopedTo = (wid: string, type: EventType, filters: DateFilters) =>
  and(
    eq(events.website_id, wid),
    eq(events.type, type),
    ...withinRange(filters)
  );
/**
 * Metrics
 *
 * These aggregate in Postgres rather than hydrating every matching event row
 * into Node to be counted there, which is what the Prisma version did. Every
 * `count(*)` is cast to int on the way out: bigint has no JSON representation
 * and these all end up in a serialised loader payload.
 */

/**
 * One column per panel — the whole of what used to be a `metadata.type` string
 * and two joins through a shared value table — and the rows that column is
 * meaningful over.
 *
 * The acquisition dimensions are scoped to `is_new_session`, which is the whole
 * of this table that is not mechanical. `referrer_host` is set only on the
 * pageview that opened a visit: the tracker reads `document.referrer` once per
 * document and ingest drops self-referrals, so every later pageview of a visit
 * carries null. `channel` does not rescue it — it is resolved per event from
 * that same referrer, so pageviews 2..N are classified `direct` for exactly the
 * same reason — and neither do the utm columns, which are lifted off
 * `location.search` at the moment of each view. Grouped over every pageview,
 * those seven answered a question about page-reading and were labelled as an
 * answer about acquisition: a site where 100 visitors arrive from google.com and
 * read five pages each reported `google.com 100 / <empty> 400`, with every real
 * referrer's share understated in proportion to pages-per-visit.
 *
 * `is_new_session` is the flag ingest sets on a session's first pageview and
 * only there — custom events never carry it — so it is the arrival, and these
 * become per-session counts. That changes what the panels count, which is why
 * `unit` is here and is checked against `Breakdowns`: a dimension cannot change
 * scope without the wire shape saying so, and the column header the dashboard
 * draws is read off that same declaration rather than restated beside it.
 *
 * The technology dimensions stay scoped to pageviews. Browser, OS, device,
 * country, locale and path are facts about the view, they are recorded on every
 * one of them, and "which pages were read" is the question that panel exists to
 * answer.
 *
 * `empty` is what to do with the rows where the column is null, and it is a
 * per-dimension decision because null does not mean the same thing twice.
 *
 * For most of them it is an answer: no country is a deployment with no geo-aware
 * proxy in front of it, no referrer is a visit that arrived without one. Those
 * are `counted`, and the panels name the bucket ("Unknown", "No referrer").
 *
 * For the five utm columns it is the *absence* of the thing the panel is a list
 * of. Every visit that arrived without campaign parameters — on a normal site,
 * substantially all of them — coalesced into one bucket the panel then labelled
 * "Unknown", which reads as "a campaign we could not attribute" and is counted
 * as "arrived without a campaign". It sorted first, so it was also the bar every
 * real campaign's share was drawn relative to, and its Daily visitors figure was
 * the site's whole audience sitting in a card headed "Campaigns". They are
 * `omitted`: a session with no utm_source is not an unidentified source, it is
 * not a row. How much traffic that is remains on the dashboard and one card
 * over, where `channel` counts a visit as `campaign` if it carried any utm value
 * at all — which is the question with a denominator behind it.
 */
const BREAKDOWN_SCOPES = {
  pages: { column: events.path, unit: "views", empty: "counted" },
  referrers: {
    column: events.referrer_host,
    unit: "sessions",
    empty: "counted",
  },
  channels: { column: events.channel, unit: "sessions", empty: "counted" },
  browsers: { column: events.browser, unit: "views", empty: "counted" },
  os: { column: events.os, unit: "views", empty: "counted" },
  devices: { column: events.device, unit: "views", empty: "counted" },
  countries: { column: events.country, unit: "views", empty: "counted" },
  locales: { column: events.locale, unit: "views", empty: "counted" },
  utmSources: {
    column: events.utm_source,
    unit: "sessions",
    empty: "omitted",
  },
  utmMediums: {
    column: events.utm_medium,
    unit: "sessions",
    empty: "omitted",
  },
  utmCampaigns: {
    column: events.utm_campaign,
    unit: "sessions",
    empty: "omitted",
  },
  utmTerms: { column: events.utm_term, unit: "sessions", empty: "omitted" },
  utmContents: {
    column: events.utm_content,
    unit: "sessions",
    empty: "omitted",
  },
} satisfies {
  [D in keyof Breakdowns]: {
    column: AnyPgColumn;
    unit: Breakdowns[D]["unit"];
    empty: "counted" | "omitted";
  };
};

export type BreakdownDimension = keyof typeof BREAKDOWN_SCOPES;

export const BREAKDOWN_DIMENSIONS = Object.keys(
  BREAKDOWN_SCOPES
) as BreakdownDimension[];

/**
 * Panels fold their list at eight rows and the tail of `path` or `utm_term` is
 * unbounded, so everything past this would be serialised into the document and
 * never drawn. Twelve panels make that twelve times over.
 */
const BREAKDOWN_LIMIT = 100;

/**
 * One panel, with the unit its rows are in.
 *
 * Grouped twice on purpose. `count(DISTINCT visitor_id)` in the outer position
 * is an *ordered* aggregate, and an ordered aggregate switches the whole node
 * off hash aggregation (`numOrderedAggs > 0` disables `can_hash`) and off
 * parallelism: every panel became a GroupAggregate over a full sort of the
 * window, spilling to disk, twelve times per render. Grouping by
 * (element, visitor_id) first and counting the groups asks the same question
 * with plain `count(*)`, which hashes.
 *
 * Measured on 588k events, one site, default work_mem: at the 7 day preset all
 * twelve panels go from ~125ms to ~25ms and stop writing temp files; at 30 days
 * the input no longer fits in work_mem either way and it is a wash (~490ms
 * both). Never slower, and it is the shape that benefits from more memory
 * rather than the shape that cannot use it. Row-for-row identical output,
 * checked against the previous query for all twelve dimensions.
 *
 * The acquisition scope (see BREAKDOWN_SCOPES) is a heap-side filter and not an
 * access-path change — `is_new_session` is in no index and must not be put in
 * one, since ADDENDUM v2 §D reserves this table's HOT-update headroom. It costs
 * nothing: the qual is evaluated on rows the scan has already fetched for the
 * `(website_id, type, created_at)` range, and it removes half of them before the
 * aggregate. Measured warm on 494k pageviews / 240k sessions, one site, default
 * work_mem, three runs each — 24h 5.0ms -> 3.3ms, 7d 25.3ms -> 19.2ms (same
 * bitmap index scan, same 2341 buffers, `Filter: is_new_session` removing 27159
 * of 52358 rows), 30d 200ms -> 170ms (both seq-scan the 42% of the table the
 * window covers; the filtered one stops the HashAggregate spilling 7MB to a
 * temp file). Cheaper at every preset, and never a page more read.
 */
export async function getWebsiteBreakdown(
  wid: string,
  dimension: BreakdownDimension,
  filters: DateFilters = {}
): Promise<Breakdown> {
  const { column, unit, empty } = BREAKDOWN_SCOPES[dimension];

  const perVisitor = db
    .select({
      // Null is an answer, not a missing row, wherever `empty` says so: no
      // referrer means a visit that arrived without one, no country means a
      // deployment with no geo-aware proxy in front of it. Dropped instead of
      // bucketed, those would leave the panel's totals disagreeing with the
      // headline count for no visible reason. The empty string is what the
      // panels already label ("No referrer", "Unknown"); putting that wording in
      // SQL would both hard-code UI copy and collide with a site whose real
      // value is the word Unknown.
      element: sql<string>`coalesce(${column}, '')`.as("element"),
      visitor: events.visitor_id,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(events)
    .where(
      and(
        scopedTo(wid, "pageview", filters),
        unit === "sessions" ? eq(events.is_new_session, true) : undefined,
        // Written against the same `coalesce` the bucket is grouped by rather
        // than as `is not null`, so what is filtered out is exactly the row the
        // panel would have drawn as the empty bucket — including a legacy row
        // holding '' rather than null, which the two spellings would otherwise
        // disagree about. One more heap-side qual on rows the range scan has
        // already fetched; on a site with no campaigns it removes all of them.
        empty === "omitted" ? sql`coalesce(${column}, '') <> ''` : undefined
      )
    )
    // By ordinal: drizzle renders a column unqualified inside an sql template
    // and qualified in a groupBy position, so naming the bucket here would
    // mean writing the expression a second time and trusting two spellings of
    // it to stay identical.
    .groupBy(sql`1, 2`)
    .as("per_visitor");

  const rows = await db
    .select({
      element: perVisitor.element,
      count: sql<number>`sum(${perVisitor.count})::int`,
      // Distinct visitors. One inner row per (element, visitor), so counting
      // them is the distinct count — see the note above on why it is not
      // spelled that way.
      unique: sql<number>`count(*)::int`,
    })
    .from(perVisitor)
    .groupBy(sql`1`)
    // The tie-break is what makes the cut stable — without it two windows of
    // the same dashboard can disagree about which rows are in the last places,
    // and the panel reshuffles between renders.
    .orderBy(sql`sum(${perVisitor.count}) DESC, 1 ASC`)
    .limit(BREAKDOWN_LIMIT);

  return { unit, rows };
}

/** What one goal earned in one currency. Never merged with another currency. */
export type EventRevenue = { currency: string; total: number };

export type CustomEventRow = {
  name: string;
  count: number;
  unique: number;
  /**
   * One total per currency the goal was reported in, largest first, and empty
   * when it carries no revenue at all.
   *
   * Not a single number: ingest stores `currency` alongside every amount
   * precisely because a site can sell in more than one, and `sum(revenue)`
   * across the group answered 49.00 EUR + 10.00 USD with "59" — a quantity in
   * no unit, which no consumer could tell from money.
   */
  revenue: EventRevenue[];
};

/**
 * Goals: the named events a site fires itself through `aurora()`.
 *
 * Deliberately the one metric that reads `type = 'event'` — everything else on
 * the dashboard excludes them, which is why they can be counted here without
 * any of it moving.
 *
 * Two passes over the same (small) slice rather than one: the counts have to be
 * per name, the money has to be per name *and* currency, and rolling the two
 * into one grouping would either split a goal's count across its currencies or
 * double-count a visitor who paid in two of them.
 */
export async function getWebsiteCustomEvents(
  wid: string,
  filters: DateFilters = {}
): Promise<CustomEventRow[]> {
  const scope = scopedTo(wid, "event", filters);

  const result = await db.execute<{
    name: string;
    count: number;
    unique: number;
    revenue: EventRevenue[];
  }>(sql`
    with goals as (
      select
        coalesce(${events.name}, '') as name,
        count(*)::int as count,
        count(distinct ${events.visitor_id})::int as "unique"
      from ${events}
      where ${scope}
      group by 1
      -- The tie-break is what makes the cut stable: ordering by count alone
      -- leaves the rows at the limit in an order Postgres may change between
      -- two renders of the same window.
      order by count(*) desc, 1 asc
      limit ${BREAKDOWN_LIMIT}
    ),
    money as (
      select
        coalesce(${events.name}, '') as name,
        ${events.currency} as currency,
        -- revenue is numeric(14,2), and sum(numeric) comes back from pg as a
        -- string — an annotation of sql<number> is a claim, not a conversion,
        -- so without the cast "49.00" would reach the dashboard and the next
        -- addition would concatenate. numeric is still the right column type:
        -- float8 addition is non-associative and the total would change with
        -- the scan order. Round at the display edge, not in the ledger.
        sum(${events.revenue})::float8 as total
      from ${events}
      where ${scope}
        and ${events.revenue} is not null
        and ${events.currency} is not null
      group by 1, 2
    )
    select
      goals.name as name,
      goals.count as count,
      goals."unique" as "unique",
      coalesce(
        jsonb_agg(
          jsonb_build_object('currency', money.currency, 'total', money.total)
          order by money.total desc, money.currency asc
        ) filter (where money.currency is not null),
        '[]'::jsonb
      ) as revenue
    from goals
    left join money on money.name = goals.name
    group by goals.name, goals.count, goals."unique"
    order by goals.count desc, goals.name asc
  `);

  return result.rows.map((row) => ({
    name: row.name,
    count: Number(row.count),
    unique: Number(row.unique),
    revenue: row.revenue ?? [],
  }));
}

/**
 * The five headline figures in one pass.
 *
 * `uniqueVisits` and `sessions` count distinct ids rather than the rows carrying
 * is_new_visitor / is_new_session, and `bounces` counts sessions rather than
 * flagged rows: the definition is "sessions that stopped at one page", and the
 * ingest path clears the flag on the whole session the moment a second pageview
 * lands, so counting flagged rows against a denominator of sessions could and
 * did report a bounce rate above 100%.
 *
 * Read `uniqueVisits` as visitor-*days*, not as an audience.
 * `visitor_id` is an HMAC whose message starts with the UTC date (schema.ts),
 * so one reader is a different id every day and no id spans two of them: over
 * an N day window this is the sum of the N daily unique counts, and it grows
 * with the window exactly as the flag count it replaced did. That is the
 * definition the schema commits to — a daily pseudonym is what makes the
 * identifier consent-free — and the tile has to be read that way. What the
 * change actually buys is smaller than "the headline bug fix": a definition
 * evaluated at read time instead of a stored derivative that depends on ingest
 * having set a flag exactly once, and "seen in the window" instead of "first
 * seen in the window", which differ across the window's leading edge.
 *
 * avgDuration is per session, not per event — a five page visit is one visit.
 * The two-level aggregate that states literally (average over sessions of the
 * sum of that session's durations) collapses into this single pass: a session's
 * sum is null only when every one of its rows is null, and avg() skips exactly
 * those, so the numerator is the plain sum over the window and the denominator
 * is the number of sessions that timed at least one page. Pageviews whose
 * beacon never arrived stay null rather than counting as zero, which is what
 * keeps them from dragging the average down.
 */
export async function getWebsiteStatistics(
  wid: string,
  filters: DateFilters = {}
): Promise<Statistics> {
  const [row] = await db
    .select({
      visits: sql<number>`count(*)::int`,
      uniqueVisits: sql<number>`count(DISTINCT ${events.visitor_id})::int`,
      sessions: sql<number>`count(DISTINCT ${events.session_id})::int`,
      bounces: sql<number>`count(DISTINCT ${events.session_id}) FILTER (WHERE ${events.is_a_bounce})::int`,
      // duration is double precision, so this stays a JS number; the same
      // expression over a numeric column would arrive as a string.
      avgDuration: sql<
        number | null
      >`sum(${events.duration}) / nullif(count(DISTINCT ${events.session_id}) FILTER (WHERE ${events.duration} IS NOT NULL), 0)`,
    })
    .from(events)
    .where(scopedTo(wid, "pageview", filters));

  return {
    visits: row?.visits ?? 0,
    uniqueVisits: row?.uniqueVisits ?? 0,
    sessions: row?.sessions ?? 0,
    bounces: row?.bounces ?? 0,
    // The SQL answers null when nothing in the window timed a page at all, and
    // that is a different fact from "the average was zero" — the column is
    // nullable for exactly this reason, and so is `Statistics.avgDuration`.
    // Flattened to 0, a self-hoster whose duration beacons are blocked read a
    // confident "0s" where the honest answer is "no data".
    avgDuration: row?.avgDuration ?? null,
  };
}

/**
 * A bucket label as an instant.
 *
 * `timestamptz AT TIME ZONE tz` yields `timestamp without time zone`, and
 * drizzle's node-postgres session overrides the type parser for that OID to
 * hand back the raw string ("2026-08-03 14:00:00"). Passing that to `new Date()`
 * would read it in the *server's* zone, so a host that isn't UTC would shift
 * every bucket; the `Z` pins it. The whole series is wall-clock-in-`tz`
 * labelled as UTC, which is the only labelling under which two buckets an hour
 * apart are an hour apart on the axis.
 *
 * The Date branch cannot run under the current driver. It is here rather than
 * absent because raw `pg` parses OID 1114 in the host's local zone, so a driver
 * change, a `types` option or a drizzle upgrade would otherwise put the naive
 * timestamp back through exactly the shift this function exists to prevent.
 * Reading the local fields back out is what undoes it.
 */
function bucketAt(value: string | Date): Date {
  if (typeof value === "string") {
    return new Date(`${value.replace(" ", "T")}Z`);
  }

  return new Date(
    Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds()
    )
  );
}

/**
 * Bucketed pageview counts, already padded.
 *
 * The empty buckets used to be generated in JS from a single zone offset
 * sampled at the start of the window, which is a reimplementation of Postgres'
 * calendar and was wrong in three separate ways: `Date.parse` could not read
 * the zone abbreviation for 37 IANA zones (Halifax, Anchorage, Honolulu,
 * Bermuda, most of the Caribbean) and returned NaN, which produced *no* buckets
 * and a blank chart; one offset for the whole window dropped the newest bucket
 * whenever DST began inside it, because Postgres buckets each row at the offset
 * in force for that row; and a numeric zone like `+05:30` means UTC+5:30 to
 * Intl and UTC-5:30 to Postgres, so the two sides bucketed eleven hours apart.
 *
 * `generate_series` over the same `date_trunc(unit, created_at AT TIME ZONE tz)`
 * expression removes the class rather than the three instances: there is now
 * one calendar, one zone database and one interpretation of `tz`, and a label
 * the query cannot produce is a label the padding cannot generate. Stepping is
 * in naive wall-clock space, which is the space `date_trunc` returns, so a day
 * is a local day and an hour a local hour across a transition.
 *
 * `unit` and `tz` are bound as parameters and additionally checked against an
 * allow-list, so a bad value fails with a clear error rather than a Postgres
 * type error.
 */
export async function getWebsiteViewsTimeSeries(
  wid: string,
  filters: { start: number; end: number; unit: string; tz: string }
): Promise<TimeseriesRow[]> {
  const unit = assertTimeseriesUnit(filters.unit);
  const tz = assertZoneName(filters.tz);

  const from = new Date(filters.start);
  const to = new Date(filters.end);

  const result = await db.execute<{ ts: string | Date; count: number }>(sql`
    with counts as (
      select
        date_trunc(${unit}, ${events.created_at} AT TIME ZONE ${tz}) as ts,
        count(*)::int as count
      from ${events}
      where ${scopedTo(wid, "pageview", filters)}
      group by 1
    )
    select series.ts as ts, coalesce(counts.count, 0)::int as count
    from generate_series(
      date_trunc(${unit}, ${from}::timestamptz AT TIME ZONE ${tz}),
      date_trunc(${unit}, ${to}::timestamptz AT TIME ZONE ${tz}),
      ('1 ' || ${unit})::interval
    ) as series(ts)
    left join counts on counts.ts = series.ts
    order by series.ts
  `);

  return result.rows.map((row) => ({
    ts: bucketAt(row.ts),
    count: Number(row.count),
  }));
}
