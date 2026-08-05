import { events, websites, type Website } from "~/db/schema";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "~/shared/lib/db.server";

export function getUserWebsites(uid: string) {
  return db
    .select()
    .from(websites)
    .where(eq(websites.user_id, uid))
    .orderBy(asc(websites.created_at));
}

/** Days of history behind each site's row on the websites index. */
export const OVERVIEW_DAYS = 7;

const DAY_MS = 86_400_000;

export type WebsiteOverview = Website & {
  views: number;
  visitors: number;
  /**
   * One bucket per 24 hours, oldest first, the last of them ending now. Always
   * OVERVIEW_DAYS long, and they sum to `views`.
   */
  spark: number[];
  lastEventAt: Date | null;
};

/**
 * The websites index used to be a plain list, which meant the first screen of
 * an analytics product carried no numbers. This attaches a week of pageviews to
 * every site in one grouped query.
 *
 * The window is exactly OVERVIEW_DAYS x 24 hours ending now, because that is
 * what the page says it is. It was "midnight UTC of (today − 6), with no upper
 * bound": six whole UTC days plus however much of the current one had elapsed,
 * which is 145 hours at 01:00 UTC and 168 only in the last second before
 * midnight — the figures under "Pageviews" and "Daily visitors" were up to 14%
 * short of the label above them, worst first thing in the UTC morning. It was
 * also a different quantity from the dashboard's "Last 7 days", so clicking a
 * row led to a Pageviews tile that disagreed with the row it was clicked from
 * with nothing on either page to explain it. Both are now the same rolling
 * 168 hours.
 *
 * The buckets follow the window rather than the calendar: bucket 0 is the last
 * 24 hours, bucket 6 the 24 before the other six. That keeps every bar the same
 * width — a UTC-day bucketing of a rolling window would have made the newest
 * bar a part-day stub and drawn a fall in traffic that had not happened — and it
 * means the sparkline sums to the figure printed beside it. It still takes no
 * timezone, which is the one thing the UTC-day bucketing had going for it: a
 * shape-at-a-glance sparkline is not a figure anyone reads off an axis.
 *
 * One scan, two groupings. GROUPING SETS gives the per-bucket counts and the
 * per-site totals from the same pass; the totals cannot be added up from the
 * buckets because `visitors` is a distinct count and a rolling bucket boundary
 * falls inside a UTC day — the same visitor_id can appear in two buckets, and
 * summing them would count that reader twice. Over the window itself the count
 * is exact and needs no correction: visitor_id is an HMAC over the UTC date, so
 * one person is a different id each day and no id spans two of them. Which is
 * also to say that this figure, like the dashboard's, is visitor-*days* and not
 * an audience — a reader who came every morning is seven of them.
 */
export async function getUserWebsitesOverview(
  uid: string
): Promise<WebsiteOverview[]> {
  const sites = await getUserWebsites(uid);

  if (sites.length === 0) {
    return [];
  }

  const now = new Date();
  const since = new Date(now.getTime() - OVERVIEW_DAYS * DAY_MS);

  const scope = and(
    inArray(
      events.website_id,
      sites.map((site) => site.id)
    ),
    eq(events.type, "pageview"),
    gte(events.created_at, since),
    lt(events.created_at, now)
  );

  const result = await db.execute<{
    website_id: string;
    bucket: number | null;
    is_total: number;
    views: number;
    visitors: number;
    last: string | Date | null;
  }>(sql`
    with scoped as (
      select
        ${events.website_id} as website_id,
        ${events.visitor_id} as visitor_id,
        ${events.created_at} as created_at,
        -- Whole 24-hour steps back from the same instant the window was cut at,
        -- so bucket 0 ends exactly where the window does. \`least\` catches the
        -- single event that can land on the inclusive lower bound and index one
        -- past the end, which would drop it from the sparkline while leaving it
        -- in the total the sparkline is supposed to add up to.
        least(
          floor(
            extract(epoch from (${now}::timestamptz - ${events.created_at})) / 86400
          )::int,
          ${OVERVIEW_DAYS - 1}
        ) as bucket
      from ${events}
      where ${scope}
    )
    select
      website_id,
      bucket,
      -- Which of the two groupings a row came from, asked of Postgres rather
      -- than inferred from a null bucket: the expression is not nullable, but
      -- reading the total row off "bucket is null" would be a claim about that
      -- rather than about the grouping.
      grouping(bucket)::int as is_total,
      count(*)::int as views,
      count(distinct visitor_id)::int as visitors,
      max(created_at) as last
    from scoped
    group by grouping sets ((website_id, bucket), (website_id))
  `);

  const byWebsite = new Map<
    string,
    { views: number; visitors: number; last: Date | null; spark: number[] }
  >();

  for (const row of result.rows) {
    const entry = byWebsite.get(row.website_id) ?? {
      views: 0,
      visitors: 0,
      last: null,
      spark: Array.from({ length: OVERVIEW_DAYS }, () => 0),
    };

    if (row.is_total) {
      entry.views = Number(row.views);
      entry.visitors = Number(row.visitors);
      entry.last = row.last ? new Date(row.last) : null;
    } else if (row.bucket !== null) {
      // Oldest first, so the sparkline reads left to right into the present.
      entry.spark[OVERVIEW_DAYS - 1 - row.bucket] = Number(row.views);
    }

    byWebsite.set(row.website_id, entry);
  }

  return sites.map((site) => {
    const entry = byWebsite.get(site.id);

    return {
      ...site,
      views: entry?.views ?? 0,
      visitors: entry?.visitors ?? 0,
      lastEventAt: entry?.last ?? null,
      spark: entry?.spark ?? Array.from({ length: OVERVIEW_DAYS }, () => 0),
    };
  });
}

export async function getWebsite(wid: string) {
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, wid))
    .limit(1);

  return website ?? null;
}

export async function createWebsite(data: {
  name: string;
  url: string;
  is_public: boolean;
  user_id: string;
}) {
  const [website] = await db.insert(websites).values(data).returning();

  return website;
}

export async function updateWebsite(
  wid: string,
  data: Partial<{ name: string; url: string; is_public: boolean }>
) {
  const [website] = await db
    .update(websites)
    .set(data)
    .where(eq(websites.id, wid))
    .returning();

  return website;
}

/** Events cascade via the schema's foreign key. */
export async function deleteWebsite(wid: string) {
  const [website] = await db
    .delete(websites)
    .where(eq(websites.id, wid))
    .returning();

  return website;
}
