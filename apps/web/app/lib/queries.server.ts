import { Prisma } from "~/generated/prisma/client";
import { prisma } from "./db.server";
import { hash } from "./hash.server";

export { prisma };

export type DateFilters = {
  start?: string | number | null;
  end?: string | number | null;
};

const toIso = (date: string | number) => new Date(Number(date)).toISOString();

const createdAtRange = ({ start, end }: DateFilters) => ({
  ...(start && { gte: toIso(start) }),
  ...(end && { lte: toIso(end) }),
});

/**
 * Users
 */

export function getUsers() {
  return prisma.user.findMany();
}

export function getUser(uid: string) {
  return prisma.user.findUnique({ where: { id: uid } });
}

export function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function countUsers() {
  return prisma.user.count();
}

export function createUser(data: {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}) {
  return prisma.user.create({
    data: { ...data, password: hash(data.password)! },
  });
}

export function updateUser(
  uid: string,
  data: Partial<{
    firstname: string;
    lastname: string;
    email: string;
    password: string;
  }> = {}
) {
  const { password, ...rest } = data;

  return prisma.user.update({
    where: { id: uid },
    data: { ...rest, ...(password && { password: hash(password)! }) },
  });
}

export function deleteUser(uid: string) {
  return prisma.user.delete({ where: { id: uid } });
}

/**
 * Websites
 */

export function getUserWebsites(uid: string) {
  return prisma.website.findMany({ where: { user_id: uid } });
}

export function getWebsite(wid: string) {
  return prisma.website.findUnique({ where: { id: wid } });
}

export function createWebsite(data: {
  name: string;
  url: string;
  is_public: boolean;
  user_id: string;
}) {
  return prisma.website.create({ data });
}

export function updateWebsite(
  wid: string,
  data: Partial<{ name: string; url: string; is_public: boolean }> = {}
) {
  return prisma.website.update({ where: { id: wid }, data });
}

export function deleteWebsite(wid: string) {
  return prisma.website.delete({ where: { id: wid } });
}

/**
 * Metrics
 */

export function getWebsiteViewsByPage(wid: string, filters: DateFilters = {}) {
  return prisma.event.findMany({
    where: {
      type: "pageView",
      website_id: wid,
      created_at: createdAtRange(filters),
    },
  });
}

export function getWebsiteViewsByMetadata(
  wid: string,
  metadata = "os",
  filters: DateFilters = {}
) {
  const eventScope = {
    website_id: wid,
    created_at: createdAtRange(filters),
  };

  return prisma.metadata.findMany({
    include: { events: { where: eventScope } },
    where: { type: metadata, events: { some: eventScope } },
  });
}

export async function getWebsiteStatistics(
  wid: string,
  filters: DateFilters = {}
) {
  const created_at = createdAtRange(filters);

  const count = (where: Prisma.EventWhereInput) =>
    prisma.event.aggregate({
      _count: { _all: true },
      where: { website_id: wid, created_at, ...where },
    });

  const [avgDuration, visits, sessions, uniqueVisits, bounces] =
    await Promise.all([
      prisma.event.aggregate({
        _avg: { duration: true },
        where: { website_id: wid, created_at },
      }),
      count({}),
      count({ is_new_session: true }),
      count({ is_new_visitor: true }),
      count({ is_a_bounce: true }),
    ]);

  return { visits, bounces, sessions, avgDuration, uniqueVisits };
}

export type TimeseriesUnit = "hour" | "day" | "month" | "year";

export type TimeseriesRow = { ts: Date; count: number };

/**
 * Bucketed pageview counts.
 *
 * Every value is bound as a query parameter — this replaces a $queryRawUnsafe
 * call that interpolated `wid`, `tz` and the dates straight into the SQL. `unit`
 * and `tz` are additionally checked against an allow-list so a bad value fails
 * with a clear error instead of a Postgres type error. `count(*)` is cast to int
 * because Postgres returns bigint, which is not JSON-serialisable.
 */
export async function getWebsiteViewsTimeSeries(
  wid: string,
  filters: { start: string; end: string; unit: string; tz: string }
) {
  const unit = assertUnit(filters.unit);
  const tz = assertTimeZone(filters.tz);

  const rows = await prisma.$queryRaw<TimeseriesRow[]>`
    SELECT date_trunc(${unit}, created_at AT TIME ZONE ${tz}) AS ts,
           count(*)::int AS count
    FROM events
    WHERE website_id = ${wid}
      AND created_at BETWEEN ${new Date(Number(filters.start))}
      AND ${new Date(Number(filters.end))}
    GROUP BY ts
  `;

  return rows;
}

const UNITS: readonly TimeseriesUnit[] = ["hour", "day", "month", "year"];

function assertUnit(unit: string): TimeseriesUnit {
  if (!UNITS.includes(unit as TimeseriesUnit)) {
    throw new Error(`Invalid unit: ${unit}`);
  }

  return unit as TimeseriesUnit;
}

function assertTimeZone(tz: string) {
  try {
    // Throws RangeError for anything Intl doesn't recognise as a zone.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new Error(`Invalid time zone: ${tz}`);
  }

  return tz;
}
