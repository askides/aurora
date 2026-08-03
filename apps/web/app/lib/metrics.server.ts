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

/** Postgres only returns buckets that have rows; the gaps are filled here. */
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
