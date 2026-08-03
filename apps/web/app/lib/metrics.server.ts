import { addMinutes, eachDayOfInterval, eachHourOfInterval } from "date-fns";
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
  return addMinutes(date, getTzOffset(tz));
}

function interval(startTs: string, endTs: string, unit: string, tz: string) {
  const start = new Date(Number(startTs));
  const end = new Date(Number(endTs));

  switch (unit) {
    case "hour":
      return eachHourOfInterval({ start, end }).map((date) =>
        switchTz(date, tz)
      );
    case "day":
      return eachDayOfInterval({ start, end });
    default:
      throw new Error(`Invalid unit: ${unit}`);
  }
}

const setTimeToZero = (date: string) => `${date.split("T")[0]}T00:00:00.000Z`;

export async function timeseries(
  wid: string,
  filters: { start: string; end: string; unit: string; tz: string }
): Promise<TimeseriesPoint[]> {
  const rows = await getWebsiteViewsTimeSeries(wid, filters);

  let data = rows.map((row) => ({
    ...row,
    ts: new Date(row.ts).toISOString(),
  }));

  let buckets = interval(
    filters.start,
    filters.end,
    filters.unit,
    filters.tz
  ).map((date) => date.toISOString());

  if (filters.unit !== "hour") {
    data = data.map((row) => ({ ...row, ts: setTimeToZero(row.ts) }));
    buckets = buckets.map(setTimeToZero);
  }

  return buckets.map((bucket) => {
    const views = data.find((row) => row.ts === bucket);

    return { timeseries: bucket, count: views ? Number(views.count) : 0 };
  });
}

export async function pages(
  wid: string,
  filters: { start: string; end: string }
): Promise<BreakdownRow[]> {
  const events = await getWebsiteViewsByPage(wid, filters);
  const totals: Record<string, { views: number; unique: number }> = {};

  for (const event of events) {
    totals[event.element] ??= { views: 0, unique: 0 };
    totals[event.element].views += 1;
    totals[event.element].unique += event.is_new_visitor ? 1 : 0;
  }

  return Object.entries(totals).map(([element, data]) => ({
    element,
    ...data,
  }));
}

export async function metadata(
  wid: string,
  meta: string,
  filters: { start: string; end: string }
): Promise<BreakdownRow[]> {
  const rows = await getWebsiteViewsByMetadata(wid, meta, filters);
  const totals: Record<string, { views: number; unique: number }> = {};

  // One `value` can span several metadata rows (e.g. per browser version).
  for (const row of rows) {
    const unique = row.events.filter((event) => event.is_new_visitor);

    totals[row.value] ??= { views: 0, unique: 0 };
    totals[row.value].views += row.events.length;
    totals[row.value].unique += unique.length;
  }

  return Object.entries(totals).map(([value, data]) => ({
    element: meta === "locale" ? localeName(value) : value,
    ...data,
  }));
}

/** locale-codes returns undefined for tags it doesn't know; fall back to the tag. */
function localeName(tag: string) {
  return localeCodes.getByTag(tag)?.location ?? tag;
}

export async function statistics(
  wid: string,
  filters: { start: string; end: string }
): Promise<Statistics> {
  const data = await getWebsiteStatistics(wid, filters);

  return {
    visits: data.visits._count._all,
    uniqueVisits: data.uniqueVisits._count._all,
    bounces: data.bounces._count._all,
    sessions: data.sessions._count._all,
    avgDuration: data.avgDuration._avg.duration || 0,
  };
}
