/**
 * `date_trunc`'s unit and the `AT TIME ZONE` operand end up in the timeseries
 * query. Both are bound as parameters, but they are validated here as well so a
 * bad value fails with a clear message instead of a Postgres type error.
 *
 * Shared by the loader (which turns a bad value into a 400) and the query layer
 * (which treats it as a last line of defence).
 */

export const TIMESERIES_UNITS = ["hour", "day", "month", "year"] as const;

export type TimeseriesUnit = (typeof TIMESERIES_UNITS)[number];

export function isValidTimeZone(tz: string) {
  try {
    // Intl throws a RangeError for anything it doesn't recognise as a zone.
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isTimeseriesUnit(unit: string): unit is TimeseriesUnit {
  return TIMESERIES_UNITS.includes(unit as TimeseriesUnit);
}

export function assertTimeZone(tz: string) {
  if (!isValidTimeZone(tz)) {
    throw new Error(`Invalid time zone: ${tz}`);
  }

  return tz;
}

export function assertTimeseriesUnit(unit: string): TimeseriesUnit {
  if (!isTimeseriesUnit(unit)) {
    throw new Error(`Invalid unit: ${unit}`);
  }

  return unit;
}
