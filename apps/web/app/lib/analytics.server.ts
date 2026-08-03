import { subDays } from "date-fns";
import * as metrics from "./metrics.server";
import { isValidTimeZone } from "./timezone";

export const RANGES = {
  LAST_24_HOURS: { label: "Last 24 Hours", days: 1, unit: "hour" },
  LAST_7_DAYS: { label: "Last 7 Days", days: 6, unit: "day" },
  LAST_30_DAYS: { label: "Last 30 Days", days: 29, unit: "day" },
} as const;

export type RangeKey = keyof typeof RANGES;

export function isRangeKey(value: string | null): value is RangeKey {
  return value !== null && value in RANGES;
}

/**
 * The old dashboard held filters in a reducer and fired eight SWR requests.
 * Range and timezone now live in the URL so a single loader can resolve every
 * panel server-side, and the view is shareable/bookmarkable.
 */
export function resolveFilters(url: URL) {
  const rangeParam = url.searchParams.get("range");
  const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "LAST_24_HOURS";
  const tz = url.searchParams.get("tz") || "UTC";

  // Rejected here so a bad ?tz surfaces as a 400 rather than a query error.
  if (!isValidTimeZone(tz)) {
    throw new Response("Invalid time zone", { status: 400 });
  }

  const { days, unit } = RANGES[range];

  return {
    range,
    tz,
    unit,
    start: String(subDays(new Date(), days).getTime()),
    end: String(new Date().getTime()),
  };
}

export async function loadDashboard(wid: string, url: URL) {
  const filters = resolveFilters(url);
  const window = { start: filters.start, end: filters.end };

  const [stats, series, pages, referrers, devices, os, browsers, countries] =
    await Promise.all([
      metrics.statistics(wid, window),
      metrics.timeseries(wid, filters),
      metrics.pages(wid, window),
      metrics.metadata(wid, "referrer", window),
      metrics.metadata(wid, "device", window),
      metrics.metadata(wid, "os", window),
      metrics.metadata(wid, "browser", window),
      metrics.metadata(wid, "locale", window),
    ]);

  return {
    range: filters.range,
    stats,
    series,
    breakdowns: { pages, referrers, devices, os, browsers, countries },
  };
}
