import { eventMetadata, events, metadata, users, websites } from "~/db/schema";
import { and, between, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "./db.server";
import { hash } from "./hash.server";
import { assertTimeZone, assertTimeseriesUnit } from "./timezone";
import type { BreakdownRow, Statistics, TimeseriesRow } from "./types";

export { db };

export type DateFilters = {
  start?: string | number | null;
  end?: string | number | null;
};

const toDate = (value: string | number) => new Date(Number(value));

/** Range predicate shared by every metric query. */
function withinRange({ start, end }: DateFilters) {
  return [
    start ? gte(events.created_at, toDate(start)) : undefined,
    end ? lte(events.created_at, toDate(end)) : undefined,
  ].filter(Boolean);
}

const scopedTo = (wid: string, filters: DateFilters) =>
  and(eq(events.website_id, wid), ...withinRange(filters));

/**
 * Users
 */

export function getUsers() {
  return db.select().from(users);
}

export async function getUser(uid: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, uid))
    .limit(1);

  return user ?? null;
}

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function countUsers() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  return row?.count ?? 0;
}

export async function createUser(data: {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}) {
  const [user] = await db
    .insert(users)
    .values({ ...data, password: hash(data.password)! })
    .returning();

  return user;
}

export async function updateUser(
  uid: string,
  data: Partial<{
    firstname: string;
    lastname: string;
    email: string;
    password: string;
  }> = {}
) {
  const { password, ...rest } = data;

  const [user] = await db
    .update(users)
    .set({ ...rest, ...(password && { password: hash(password)! }) })
    .where(eq(users.id, uid))
    .returning();

  return user;
}

export async function deleteUser(uid: string) {
  const [user] = await db.delete(users).where(eq(users.id, uid)).returning();

  return user;
}

/**
 * Websites
 */

export function getUserWebsites(uid: string) {
  return db.select().from(websites).where(eq(websites.user_id, uid));
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
  data: Partial<{ name: string; url: string; is_public: boolean }> = {}
) {
  const [website] = await db
    .update(websites)
    .set(data)
    .where(eq(websites.id, wid))
    .returning();

  return website;
}

/** Events and their join rows cascade via the schema's foreign keys. */
export async function deleteWebsite(wid: string) {
  const [website] = await db
    .delete(websites)
    .where(eq(websites.id, wid))
    .returning();

  return website;
}

/**
 * Metrics
 *
 * These aggregate in Postgres rather than hydrating every matching event row
 * into Node to be counted there, which is what the Prisma version did.
 */

export function getWebsiteViewsByPage(
  wid: string,
  filters: DateFilters = {}
): Promise<BreakdownRow[]> {
  return db
    .select({
      element: events.element,
      views: sql<number>`count(*)::int`,
      unique: sql<number>`count(*) FILTER (WHERE ${events.is_new_visitor})::int`,
    })
    .from(events)
    .where(and(eq(events.type, "pageView"), scopedTo(wid, filters)))
    .groupBy(events.element);
}

export function getWebsiteViewsByMetadata(
  wid: string,
  type = "os",
  filters: DateFilters = {}
): Promise<BreakdownRow[]> {
  return db
    .select({
      element: metadata.value,
      views: sql<number>`count(*)::int`,
      unique: sql<number>`count(*) FILTER (WHERE ${events.is_new_visitor})::int`,
    })
    .from(events)
    .innerJoin(eventMetadata, eq(eventMetadata.event_id, events.id))
    .innerJoin(metadata, eq(metadata.id, eventMetadata.metadata_id))
    .where(and(eq(metadata.type, type), scopedTo(wid, filters)))
    .groupBy(metadata.value);
}

/** All five counters in one pass instead of five separate aggregate queries. */
export async function getWebsiteStatistics(
  wid: string,
  filters: DateFilters = {}
): Promise<Statistics> {
  const [row] = await db
    .select({
      visits: sql<number>`count(*)::int`,
      uniqueVisits: sql<number>`count(*) FILTER (WHERE ${events.is_new_visitor})::int`,
      sessions: sql<number>`count(*) FILTER (WHERE ${events.is_new_session})::int`,
      bounces: sql<number>`count(*) FILTER (WHERE ${events.is_a_bounce})::int`,
      avgDuration: sql<string | null>`avg(${events.duration})`,
    })
    .from(events)
    .where(scopedTo(wid, filters));

  return {
    visits: row?.visits ?? 0,
    uniqueVisits: row?.uniqueVisits ?? 0,
    sessions: row?.sessions ?? 0,
    bounces: row?.bounces ?? 0,
    // avg() is null when nothing was measured, and arrives as a string.
    avgDuration: row?.avgDuration ? Number(row.avgDuration) : 0,
  };
}

/**
 * Bucketed pageview counts.
 *
 * `unit` and `tz` are bound as parameters and additionally checked against an
 * allow-list, so a bad value fails with a clear error rather than a Postgres
 * type error. count(*) is cast to int because bigint is not JSON-serialisable.
 */
export async function getWebsiteViewsTimeSeries(
  wid: string,
  filters: { start: string; end: string; unit: string; tz: string }
): Promise<TimeseriesRow[]> {
  const unit = assertTimeseriesUnit(filters.unit);
  const tz = assertTimeZone(filters.tz);

  return (
    db
      .select({
        ts: sql<Date>`date_trunc(${unit}, ${events.created_at} AT TIME ZONE ${tz})`,
        count: sql<number>`count(*)::int`,
      })
      .from(events)
      .where(
        and(
          eq(events.website_id, wid),
          between(events.created_at, toDate(filters.start), toDate(filters.end))
        )
      )
      // Grouped by ordinal: Drizzle renders the column qualified in GROUP BY but
      // unqualified in the select list, and Postgres would see two different
      // expressions rather than one.
      .groupBy(sql`1`)
  );
}
