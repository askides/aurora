import { addMinutes } from "date-fns";
import localeCodes from "locale-codes";
import {
  getWebsiteStatistics,
  getWebsiteViewsByMetadata,
  getWebsiteViewsByPage,
  getWebsiteViewsTimeSeries,
} from "./queries.server";
import type { BreakdownRow, Statistics, TimeseriesPoint } from "./types";

export type { BreakdownRow, Statistics, TimeseriesPoint };

export function getTzOffset(timeZone: string, date = new Date()) {
  const tz = date
    .toLocaleString("en", { timeZone, timeStyle: "long" })
    .split(" ")
    .slice(-1)[0];

  const dateString = date.toString();

  const offset =
    Date.parse(`${dateString} UTC`) - Date.parse(`${dateString} ${tz}`);

  // return UTC offset in minutes
  return offset / 1000 / 60;
}

export function switchTz(date: Date, tz: string) {
  return addMinutes(date, getTzOffset(tz, date));
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * The bucket labels the chart needs.
 *
 * Postgres returns `date_trunc(unit, created_at AT TIME ZONE tz)` — wall-clock
 * time in the requested zone, which the query layer labels as UTC. The padded
 * series has to be generated in that same space or the two never line up.
 *
 * The previous implementation built whole hours on the *server's* clock and
 * then added the zone offset, which only coincides with a truncated wall-clock
 * hour when the offset is a whole number of hours. For India (+05:30), Nepal
 * (+05:45), Iran, Newfoundland and central Australia every bucket landed on
 * :30 or :45 and matched nothing, so the chart silently read zero.
 */
function interval(startTs: string, endTs: string, unit: string, tz: string) {
  if (unit !== "hour" && unit !== "day") {
    throw new Error(`Invalid unit: ${unit}`);
  }

  const offset = getTzOffset(tz, new Date(Number(startTs))) * 60_000;
  const step = unit === "hour" ? HOUR_MS : DAY_MS;

  const start = Number(startTs) + offset;
  const end = Number(endTs) + offset;

  const buckets: Date[] = [];

  for (let ts = Math.floor(start / step) * step; ts <= end; ts += step) {
    buckets.push(new Date(ts));
  }

  return buckets;
}

/** Postgres only returns buckets that have rows; the gaps are filled here. */
export async function timeseries(
  wid: string,
  filters: { start: string; end: string; unit: string; tz: string }
): Promise<TimeseriesPoint[]> {
  const rows = await getWebsiteViewsTimeSeries(wid, filters);

  // Both sides are now truncated the same way, so the keys match exactly and
  // no after-the-fact date rounding is needed.
  const counts = new Map(
    rows.map((row) => [new Date(row.ts).toISOString(), Number(row.count)])
  );

  return interval(filters.start, filters.end, filters.unit, filters.tz).map(
    (bucket) => {
      const label = bucket.toISOString();

      return { timeseries: label, count: counts.get(label) ?? 0 };
    }
  );
}

export function pages(
  wid: string,
  filters: { start: string; end: string }
): Promise<BreakdownRow[]> {
  return getWebsiteViewsByPage(wid, filters);
}

export async function metadata(
  wid: string,
  meta: string,
  filters: { start: string; end: string }
): Promise<BreakdownRow[]> {
  const rows = await getWebsiteViewsByMetadata(wid, meta, filters);

  if (meta !== "locale") {
    return rows;
  }

  return rows.map((row) => ({ ...row, element: localeName(row.element) }));
}

/** locale-codes returns undefined for tags it doesn't know; fall back to the tag. */
function localeName(tag: string) {
  return localeCodes.getByTag(tag)?.location ?? tag;
}

export function statistics(
  wid: string,
  filters: { start: string; end: string }
): Promise<Statistics> {
  return getWebsiteStatistics(wid, filters);
}
