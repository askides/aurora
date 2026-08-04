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

/**
 * The zone names this runtime offers that Postgres refuses.
 *
 * `Intl.supportedValuesOf("timeZone")` is not the canonical zone list. On the
 * V8 the project runs it still reports 18 pre-2018 tzdata names — `Asia/Calcutta`,
 * `Europe/Kiev`, `America/Buenos_Aires` and the rest below — and it does not
 * canonicalise them either: `Asia/Calcutta` stays `Asia/Calcutta` through
 * `DateTimeFormat`, so nothing in Intl turns one into a name the other side
 * knows. Postgres carries only the current tzdata, where those names are gone;
 * `AT TIME ZONE 'Asia/Calcutta'` is a `time zone "Asia/Calcutta" not recognized`
 * error. Picking one from the dashboard therefore produced a 500 out of the
 * query layer rather than a validation error out of the loader.
 *
 * Filtering them out of the offered list is not enough on its own: these are the
 * *only* entries this runtime lists for India, Ukraine, Argentina, Greenland,
 * Myanmar, Vietnam, Nepal and the rest, so dropping them would leave those
 * regions with no zone to pick at all. They are substituted instead — each pair
 * below is the same zone under its current name, checked to agree with its alias
 * to the minute at every month of the year.
 *
 * Verified against postgres:16, the image in docker-compose.yml: all 419 names
 * `listTimeZones` offers after substitution are accepted by `AT TIME ZONE`, and
 * every one of them agrees with Intl on the wall clock it reads, in January and
 * in July. Re-run that check when the runtime's Node or the image's tzdata moves.
 *
 * A Map rather than an object literal: `"constructor" in {}` is true, and this
 * table is consulted with a string that arrives from a query parameter.
 */
const ZONE_ALIASES = new Map([
  ["Africa/Asmera", "Africa/Asmara"],
  ["America/Buenos_Aires", "America/Argentina/Buenos_Aires"],
  ["America/Catamarca", "America/Argentina/Catamarca"],
  ["America/Cordoba", "America/Argentina/Cordoba"],
  ["America/Godthab", "America/Nuuk"],
  ["America/Indianapolis", "America/Indiana/Indianapolis"],
  ["America/Jujuy", "America/Argentina/Jujuy"],
  ["America/Louisville", "America/Kentucky/Louisville"],
  ["America/Mendoza", "America/Argentina/Mendoza"],
  ["Asia/Calcutta", "Asia/Kolkata"],
  ["Asia/Katmandu", "Asia/Kathmandu"],
  ["Asia/Rangoon", "Asia/Yangon"],
  ["Asia/Saigon", "Asia/Ho_Chi_Minh"],
  ["Atlantic/Faeroe", "Atlantic/Faroe"],
  ["Europe/Kiev", "Europe/Kyiv"],
  ["Pacific/Enderbury", "Pacific/Kanton"],
  ["Pacific/Ponape", "Pacific/Pohnpei"],
  ["Pacific/Truk", "Pacific/Chuuk"],
]);

/**
 * A zone name under the spelling both sides of the app know.
 *
 * Applied wherever a zone enters the app from outside the picker — chiefly
 * `Intl.DateTimeFormat().resolvedOptions().timeZone`, which on a host whose
 * `TZ` is set to a legacy name hands back that legacy name. Left alone it goes
 * into the URL, comes back to the loader and is rejected; substituted, the
 * viewer gets their own zone and never learns it had two names.
 *
 * Anything not in the table is returned unchanged, including names that are
 * invalid outright — this canonicalises, it does not validate.
 */
export function canonicalTimeZone(tz: string) {
  return ZONE_ALIASES.get(tz) ?? tz;
}

/**
 * Every zone the picker offers.
 *
 * Read from Intl rather than a bundled table so the list can't drift from what
 * the runtime understands, then put through `canonicalTimeZone` so it can't
 * drift from what Postgres understands either — see ZONE_ALIASES. Re-sorted
 * afterwards because a substitution moves its entry (`America/Buenos_Aires`
 * becomes `America/Argentina/Buenos_Aires`), and de-duplicated because a future
 * tzdata may list an alias and its target side by side.
 *
 * "UTC" is the dashboard's fallback and is not part of the set Intl reports, so
 * it is added by hand and kept at the top rather than sorted into the Us.
 * `supportedValuesOf` is guarded because it only reached Safari in 15.4.
 */
export function listTimeZones() {
  const zones = Intl.supportedValuesOf?.("timeZone") ?? [];

  const named = [...new Set(zones.map(canonicalTimeZone))]
    .filter((zone) => zone !== "UTC")
    // The rule guards against mutating a caller's array; this one was built two
    // lines up and nothing else can see it. toSorted would need lib: es2023.
    // oxlint-disable-next-line unicorn/no-array-sort
    .sort();

  return ["UTC", ...named];
}

/**
 * The fixed-offset names, which are the one family Postgres knows and Intl does
 * not list. `Etc/GMT+5` is deliberately allowed (see the note above `isZoneName`
 * in the query layer): it is a zone *name*, and both sides read its POSIX sign
 * the same way, which is exactly what a bare `+05:30` offset does not do.
 */
const POSIX_ZONE = /^Etc\/(?:UTC|GMT(?:[+-](?:\d|1[0-4]))?)$/;

/** Built once. `listTimeZones` already canonicalises and de-duplicates. */
let offered: Set<string> | null = null;

/**
 * A zone name both Intl and Postgres accept.
 *
 * Membership of the set the pickers offer, not "whatever Intl will parse". This
 * is the predicate `isZoneName` in the query layer defers to, and it runs on a
 * value that is about to be interpolated into `AT TIME ZONE` as the last line of
 * defence, so answering true for a name that statement cannot read is the whole
 * defect — it turns a bad `?tz=` into a 500 instead of the loader's 400.
 *
 * Asking Intl was too generous by more than the 18 aliases below. Node's ICU
 * accepts the entire tzdata `backward` link set — all of `US/*`, `Canada/*`,
 * `Brazil/*`, the bare country names, some 80 more — and the Postgres image
 * carries none of them, because Debian ships those in a separate `tzdata-legacy`
 * package. `?tz=US/Eastern` therefore passed the loader and threw out of the
 * statement, and `loadDashboard` is called from the anonymous loader in
 * analytics.public.tsx: an unauthenticated 500 on a shared dashboard link.
 * Enumerating the 80 would only move the problem, since which of them exist is a
 * property of the image. The offered set is the one list this app has already
 * checked name-by-name against `AT TIME ZONE` (see ZONE_ALIASES above), so it is
 * the list to answer from.
 *
 * The aliases are still rejected explicitly by construction — `listTimeZones`
 * substitutes them away, so none of them is in the set. Rewriting the value here
 * instead of refusing it would be worse: the caller would keep using the name it
 * passed in, and the chart's labels would come back grouped by a zone whose name
 * is not the one in the URL.
 */
export function isValidTimeZone(tz: string) {
  if (POSIX_ZONE.test(tz)) {
    return true;
  }

  // Lazily, because `listTimeZones` reads Intl and this module is imported by
  // the client bundle as well as the loader.
  offered ??= new Set(listTimeZones());

  return offered.has(tz);
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

/**
 * Zoned calendar arithmetic for the range picker.
 *
 * The dashboard charts one zone and the browser runs in another as soon as the
 * picker is touched, and a day is a different pair of instants in each. date-fns
 * `startOfDay`/`endOfDay` snap in the host zone only, so picking "Aug 1" while
 * charting Asia/Tokyo produced a window whose edges sat nine hours inside the
 * day the button still claimed to be showing. Everything below works in the
 * charted zone instead, using the same zone database Intl and Postgres share.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

/** The wall-clock fields of an instant in `tz`, as numbers. */
function fieldsAt(tz: string, at: number) {
  let formatter = formatters.get(tz);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      // h23 rather than hour12:false — the latter reports midnight as hour 24
      // on some engines, which is a day out once it is fed back to Date.UTC.
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    formatters.set(tz, formatter);
  }

  const fields: Record<string, number> = {};

  for (const part of formatter.formatToParts(at)) {
    if (part.type !== "literal") {
      fields[part.type] = Number(part.value);
    }
  }

  return fields;
}

/**
 * The zone's offset from UTC at a given instant, in milliseconds.
 *
 * Sampled per instant rather than once per window: an offset is only true until
 * the next DST transition, and a range picked across one has a different offset
 * at each end.
 */
function offsetAt(tz: string, at: number) {
  const fields = fieldsAt(tz, at);

  // Intl has no millisecond field, so the instant is truncated to the second it
  // was read at; offsets are whole minutes and the remainder would otherwise
  // show up as one.
  return (
    Date.UTC(
      fields.year,
      fields.month - 1,
      fields.day,
      fields.hour,
      fields.minute,
      fields.second
    ) -
    Math.floor(at / 1000) * 1000
  );
}

/** The instant at which a wall clock in `tz` reads these fields. */
function instantOf(
  tz: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number
) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second, ms);

  // Two passes. The first offset is sampled at an instant up to a day away from
  // the answer, which is the wrong one whenever a transition falls between the
  // two; the second is sampled within an hour of it, where the offset in force
  // is the offset that applies.
  const approximate = wall - offsetAt(tz, wall);
  const offset = offsetAt(tz, approximate);
  const instant = wall - offset;

  // A wall clock inside a spring-forward gap is one no instant reads, and the
  // two passes above then answer with an instant *before* the gap. Postgres
  // resolves the same clock forward — `timestamp AT TIME ZONE` and the
  // `date_trunc(unit, created_at AT TIME ZONE tz)` the buckets are grouped by
  // both land after it — so the picker and the query disagreed by an hour in
  // every zone whose transition starts at 00:00. America/Havana, Santiago and
  // Atlantic/Azores all do: clicking the transition day gave a window running
  // from 23:00 of the day before, the range button read "Mar 7 - Mar 8" for a
  // single click on Mar 8, and reopening the picker and pressing Apply without
  // touching it doubled the window to 47 hours.
  //
  // Detected rather than assumed: the answer is only real if the zone reads it
  // back at the offset it was built with. Ambiguous clocks (fall back, read by
  // two instants) still satisfy that on the first pass and are left alone.
  if (offsetAt(tz, instant) !== offset) {
    return Math.max(instant, approximate);
  }

  return instant;
}

/**
 * The instant a picked calendar day begins in `tz`.
 *
 * The calendar hands back a `Date` whose *local* fields are the square that was
 * clicked, so the day is read off those and rebuilt in the charted zone. Taking
 * the Date's instant instead would shift the day itself whenever the two zones
 * disagree about which date it is.
 */
export function startOfZonedDay(day: Date, tz: string) {
  return instantOf(
    tz,
    day.getFullYear(),
    day.getMonth() + 1,
    day.getDate(),
    0,
    0,
    0,
    0
  );
}

/**
 * The instant the picked day *stops*, which is the next day's first one.
 *
 * Exclusive on purpose. Every range predicate in the query layer is half-open
 * (`>= start`, `< end`, see withinRange), and `resolveFilters` anchors the
 * comparison window at `previous.end === from`, so the two windows tile only if
 * the picker's end is the boundary itself. The last-millisecond form this
 * replaced was neither end of that: it left the final millisecond of the day in
 * no window at all, and it made a one-day pick 86_399_999ms long, so the
 * "previous day" it was compared against was the previous day shifted a
 * millisecond off its own midnight. The opposite patch — the next day's first
 * instant under an *inclusive* `<= end` — is what would double-count an event
 * landing exactly on midnight, in this window and again in the next.
 *
 * `Date.UTC` normalises a day past the end of the month, so the 31st resolves
 * to the 1st, and a day whose midnight DST skips resolves the same way
 * startOfZonedDay does.
 */
export function endOfZonedDayExclusive(day: Date, tz: string) {
  return instantOf(
    tz,
    day.getFullYear(),
    day.getMonth() + 1,
    day.getDate() + 1,
    0,
    0,
    0,
    0
  );
}

/**
 * The calendar day an instant falls on in `tz`, as the local-field `Date` the
 * calendar speaks — the inverse of `startOfZonedDay`, for seeding the picker
 * from the window already on screen so that reopening it can't move the
 * selection.
 *
 * The window's *end* is exclusive, so seeding the last selected square from it
 * means asking for the day the instant before it falls on; a boundary handed
 * here as-is answers with the day after the one the picker is showing.
 */
export function zonedCalendarDay(at: number, tz: string) {
  const fields = fieldsAt(tz, at);

  return new Date(fields.year, fields.month - 1, fields.day);
}

/**
 * An instant re-labelled as the wall clock it reads in `tz`.
 *
 * This is the space the chart's bucket timestamps live in: the query layer
 * groups by `created_at AT TIME ZONE tz` and labels the naive result as UTC, so
 * that two buckets an hour apart are an hour apart on the axis (see `bucketAt`
 * in queries.server.ts). Putting the window's own bounds through the same
 * relabelling is what lets the two be compared at all — the alternative is
 * comparing a bucket label against a real instant, which is off by the zone's
 * offset and looks right for exactly the viewers in UTC.
 *
 * Truncated to the second, because Intl has no millisecond field. Bucket labels
 * are whole hours or whole days, so nothing this is used for can see it.
 */
export function zonedWallClock(at: number, tz: string) {
  const fields = fieldsAt(tz, at);

  return Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second
  );
}

/**
 * The chart's buckets that are actually inside the window.
 *
 * `generate_series` pads the series between `date_trunc(unit, from)` and
 * `date_trunc(unit, to)` *inclusive*, and `to` is the window's exclusive end —
 * for a range picked as whole days that is the next day's midnight, which
 * truncates to a bucket of its own. That bucket can never hold anything, since
 * the counts beside it are `< to`, so picking "Aug 1" drew a second, empty day
 * after the one that was asked for (or, at hourly resolution, a 25th hour).
 *
 * Trimmed here rather than in the query, which is the module that owns the
 * padding and is not this slice's to change. The comparison runs in bucket
 * space — see zonedWallClock — because a label is a wall clock and the bound is
 * an instant, and comparing the two directly is wrong by the zone's offset and
 * looks right for exactly the viewers already in UTC.
 *
 * A bucket starting exactly at the window's end is outside it, by the same
 * half-open rule the rest of the range follows.
 */
export function bucketsWithin<T extends { timeseries: string }>(
  series: T[],
  to: number,
  tz: string
) {
  const end = zonedWallClock(to, tz);

  return series.filter((point) => Date.parse(point.timeseries) < end);
}
