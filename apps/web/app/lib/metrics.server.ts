import localeCodes from "locale-codes";
import {
  BREAKDOWN_DIMENSIONS,
  getWebsiteBreakdown,
  getWebsiteCustomEvents,
  getWebsiteStatistics,
  getWebsiteViewsTimeSeries,
  type CustomEventRow,
  type EventRevenue,
} from "./queries.server";
import type {
  Breakdown,
  BreakdownRow,
  Breakdowns,
  BreakdownUnit,
  Statistics,
  TimeseriesPoint,
} from "./types";

export type {
  Breakdown,
  BreakdownRow,
  Breakdowns,
  BreakdownUnit,
  CustomEventRow,
  EventRevenue,
  Statistics,
  TimeseriesPoint,
};

/** The window every panel is asked for, as epoch milliseconds. */
type Window = { start: number; end: number };

/**
 * The chart's series, one point per bucket, gaps included.
 *
 * The padding used to be generated here, by stepping milliseconds from a zone
 * offset this module derived itself. That is a second implementation of the
 * calendar Postgres already has, and it disagreed with the first one for 37
 * IANA zones, for every window containing a DST transition, and for numeric
 * zones — each disagreement showing up as buckets the chart quietly read as
 * zero, under stat tiles that still counted the same events. The series now
 * arrives padded from the same statement that counts, so there is nothing left
 * for the two sides to disagree about; see getWebsiteViewsTimeSeries.
 */
export async function timeseries(
  wid: string,
  filters: { start: number; end: number; unit: string; tz: string }
): Promise<TimeseriesPoint[]> {
  const rows = await getWebsiteViewsTimeSeries(wid, filters);

  return rows.map((row) => ({
    timeseries: row.ts.toISOString(),
    count: row.count,
  }));
}

/**
 * Every panel, in parallel.
 *
 * One query per dimension: they are independent index ranges over the same
 * window, so the database reads each one on its own and nothing here waits on
 * anything else. What used to be a `metadata.type` string threaded through two
 * joins is now the choice of a column, which is why a panel costs a query and
 * no more.
 *
 * Each panel arrives carrying the unit it is counted in — the acquisition
 * dimensions are per-session and the rest per-pageview (see BREAKDOWN_SCOPES) —
 * and that travels through untouched, so nothing between the query and the
 * column header gets to decide what the numbers are.
 */
export async function breakdowns(
  wid: string,
  filters: Window
): Promise<Breakdowns> {
  const panels = await Promise.all(
    BREAKDOWN_DIMENSIONS.map(async (dimension) => {
      const panel = await getWebsiteBreakdown(wid, dimension, filters);

      return [
        dimension,
        dimension === "locales"
          ? { ...panel, rows: panel.rows.map(toLocaleName) }
          : panel,
      ] as const;
    })
  );

  return Object.fromEntries(panels) as Breakdowns;
}

/**
 * `en-GB` is the only dimension the database stores in a form nobody reads.
 *
 * Resolved to the language, qualified by region when the tag carries one.
 * Not to locale-codes' `location` alone, which is what this returned while the
 * panel was still mislabelled as countries: a locales list reading "Italy" next
 * to a countries list reading "Italy" is the same answer twice, and it drops
 * the half of the tag the panel exists for. The browser language says who the
 * reader is, the edge header says where they are, and they disagree often.
 * `location` is also null on a bare `en` or `fr`, so that reading left the
 * panel mixing country names with raw tags.
 */
function toLocaleName(row: BreakdownRow): BreakdownRow {
  const locale = localeCodes.getByTag(row.element);

  // Unknown to locale-codes, including the empty bucket the panels label
  // "Unknown": the tag survives rather than becoming "undefined".
  if (!locale?.name) {
    return row;
  }

  return {
    ...row,
    element: locale.location
      ? `${locale.name} (${locale.location})`
      : locale.name,
  };
}

export function statistics(wid: string, filters: Window): Promise<Statistics> {
  return getWebsiteStatistics(wid, filters);
}

export function customEvents(
  wid: string,
  filters: Window
): Promise<CustomEventRow[]> {
  return getWebsiteCustomEvents(wid, filters);
}
