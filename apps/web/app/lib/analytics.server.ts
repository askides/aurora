import * as metrics from "./metrics.server";
// Straight from the query layer rather than through metrics: it is the module
// that hands `tz` to Postgres, so the rule the loader turns into a 400 and the
// rule the statement enforces are one function and cannot drift apart.
import { isZoneName } from "./queries.server";
import { CUSTOM_RANGE, DEFAULT_RANGE, isRangeKey, RANGES } from "./range";
import { startOfZonedDay, zonedCalendarDay } from "./timezone";

const DAY_MS = 86_400_000;

/** Hourly buckets stay readable across a couple of days; past that they crowd. */
const HOURLY_MAX_SPAN = 2 * DAY_MS;

/** A year of daily buckets is 366 points already, and the chart is the limit. */
const MAX_SPAN = 366 * DAY_MS;

/** Query params are strings; only a whole count of milliseconds is a timestamp. */
function timestamp(value: string | null) {
  if (value === null || value.trim() === "") {
    return null;
  }

  const ms = Number(value);

  return Number.isSafeInteger(ms) ? ms : null;
}

/**
 * Every filter resolves to a `from`/`to` pair of epoch milliseconds: the
 * presets are just a rolling window ending now, so nothing downstream of here
 * has to know which of the two the URL asked for.
 */
function resolveWindow(url: URL) {
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  // Either one present means a custom window was intended, so a half-written
  // pair is an error rather than a silent fall back to the default range.
  if (fromParam === null && toParam === null) {
    const rangeParam = url.searchParams.get("range");
    const range = isRangeKey(rangeParam) ? rangeParam : DEFAULT_RANGE;
    const to = Date.now();

    // Exactly `days` x 24 hours, counted in milliseconds. This was date-fns
    // `subDays`, which is calendar arithmetic in the *host's* zone
    // (`setDate(getDate() - n)`), so the window was 24h/day only while the
    // process's zone held one offset across it: on a server running
    // America/New_York, "Last 24 hours" measured 23 or 25 hours for the 24
    // consecutive values of `to` around each transition, "Last 7 days" 167 or
    // 169, "Last 30 days" 719 or 721. An hour out of 24 is ±4.2% on Pageviews,
    // Daily visitors and Sessions, under a button that states the number.
    //
    // It also made the length of the window a property of the machine while
    // every bucket, day boundary and comparison window is a property of `?tz`:
    // two viewers of one instance in two zones got the same window, and a
    // self-hoster who set the container's TZ changed what "Last 7 days" meant
    // for everybody. A preset is a duration ending now — see RANGES, where
    // `days` is documented as the length of the window — so it is measured as
    // one, in the only unit no calendar can reinterpret.
    return { range, from: to - RANGES[range].days * DAY_MS, to };
  }

  const from = timestamp(fromParam);
  const to = timestamp(toParam);

  if (from === null || to === null) {
    throw new Response("from and to must both be timestamps in milliseconds", {
      status: 400,
    });
  }

  // The picker sends the end of the selected day, which is in the future for a
  // range ending today — and further ahead the more the viewer leads the
  // server. Clamping keeps the chart from trailing off into empty buckets.
  const end = Math.min(to, Date.now());

  if (from >= end) {
    throw new Response("from must be before to", { status: 400 });
  }

  if (end - from > MAX_SPAN) {
    throw new Response("Range is longer than a year", { status: 400 });
  }

  return { range: CUSTOM_RANGE, from, to: end };
}

/**
 * Where an instant sits in the charted zone: which calendar day it falls on,
 * and whether it is that day's first instant.
 *
 * Alignment is a flag and not an offset into the day, deliberately. The elapsed
 * milliseconds since local midnight are *not* the wall clock on a day that
 * changed offset — 08:00 EDT on a spring-forward Sunday is seven hours elapsed,
 * not eight — so carrying that remainder across a day boundary charged the
 * transition of a neighbouring day to whatever it was carried into. The one
 * question the comparison window has to ask is whether this window was drawn on
 * calendar squares, and that is a yes or a no.
 */
function zonedDayPosition(at: number, tz: string) {
  const day = zonedCalendarDay(at, tz);

  return { day, aligned: at === startOfZonedDay(day, tz) };
}

/** The same square of the calendar, `days` days earlier. */
function daysBefore(day: Date, days: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - days);
}

/**
 * The window immediately before this one, ending exactly where it starts.
 *
 * Two windows are only comparable if they are the same *length*, and what "the
 * same length" means depends on what the current one is a window *of*. This
 * dashboard draws two kinds, and they need opposite arithmetic.
 *
 * A pinned window is a run of calendar days: the picker builds it from
 * `startOfZonedDay` to `endOfZonedDayExclusive`, and "Mar 8" means the whole of
 * Mar 8 however many hours the zone gave it. Its comparison is the days before
 * it. Counting back `to - from` milliseconds instead landed an hour inside the
 * day before — the 23 hours preceding a 23-hour day start at 01:00 of the
 * previous day, not at its midnight — so every stat card compared 23 hours of
 * traffic against 24 and reported the ~4% as a trend. Read off the calendar
 * with `startOfZonedDay`, the same zone database the query layer groups buckets
 * by, so the comparison lines up with the buckets drawn over it.
 *
 * A preset is a *duration* ending now: "Last 24 hours" is 24 hours, at whatever
 * o'clock now happens to be, and RANGES documents `days` as the length of the
 * window for exactly that reason. Shifting one of those by calendar days is the
 * same defect with its sign flipped, and worse — the comparison comes back 23
 * or 25 hours against a current 24, which is the phantom trend restored on the
 * *default* range; it charges the window the transition of a day it need not
 * even contain; and where the window ends at midnight but starts 24 hours into
 * a 25-hour day it comes back inverted, `start` after `end`. `withinRange`
 * answers an inverted window with zero rows and no error, so every count tile
 * read "New" and the two rate tiles were compared against nothing at all. A
 * window measured in milliseconds is compared in milliseconds, which is exact:
 * neither end is pinned to a calendar square, so no day's length is being asked
 * about.
 *
 * Which kind it is comes from the caller rather than from the instants. The two
 * are not distinguishable after the fact: once every 24 hours `Date.now()`
 * lands on a local midnight and a preset resolves to a window shaped exactly
 * like a picked calendar day. Inferring from the shape gave "Last 24 hours" a
 * 23-hour comparison on that one instant a year per zone — measured, against
 * Postgres, on uniform hourly traffic: 24 against 23 at 2026-03-10 00:00
 * America/New_York, and nowhere else in the fortnight around the transition.
 *
 * The end is `from` in both cases, and that is what makes the two windows tile:
 * every range predicate is half-open (`>= start`, `< end`, see withinRange), so
 * the shared instant belongs to this window and to no other. A
 * `previous.end = from - 1` patch would leave a millisecond in neither.
 */
function previousWindow(
  from: number,
  to: number,
  tz: string,
  { pinned }: { pinned: boolean }
) {
  if (pinned) {
    const start = zonedDayPosition(from, tz);
    const end = zonedDayPosition(to, tz);

    // Rounded, not truncated: these are two midnights as the *host* zone reads
    // them, and a host with its own DST puts 23 or 25 hours between a pair of
    // them just as readily.
    const days = Math.round((end.day.getTime() - start.day.getTime()) / DAY_MS);

    // Not every pinned window is whole days — `?from=&to=` is a public URL and
    // takes any two instants — and one that is not spans no calendar to read.
    if (days > 0 && start.aligned && end.aligned) {
      const shifted = startOfZonedDay(daysBefore(start.day, days), tz);

      // Unreachable, since `days >= 1` puts `shifted` a whole calendar day or
      // more before `from` in every zone. Checked rather than argued because
      // what it guards against is a window the query layer answers with zero
      // rows and no error.
      if (shifted < from) {
        return { start: shifted, end: from };
      }
    }
  }

  return { start: from - (to - from), end: from };
}

/**
 * The old dashboard held filters in a reducer and fired eight SWR requests.
 * The window and timezone now live in the URL so a single loader can resolve
 * every panel server-side, and the view is shareable/bookmarkable.
 */
export function resolveFilters(url: URL) {
  const tz = url.searchParams.get("tz") || "UTC";

  // Rejected here so a bad ?tz surfaces as a 400 rather than a query error.
  // Names only: Intl and Postgres both accept `+05:30` and read its sign the
  // opposite way round, so an offset would silently relabel the chart eleven
  // hours off. Same rule the query layer enforces as a last line of defence.
  if (!isZoneName(tz)) {
    throw new Response("Invalid time zone", { status: 400 });
  }

  const { range, from, to } = resolveWindow(url);
  const span = to - from;

  return {
    range,
    tz,
    from,
    to,
    // Derived from the span rather than carried by the range, so a custom
    // window of a day buckets the same way the 24 hour preset does.
    unit: span <= HOURLY_MAX_SPAN ? ("hour" as const) : ("day" as const),
    // The window immediately before this one, so every figure on the dashboard
    // can be stated as a change rather than a bare count. Anchored to `from`,
    // which tiles the two windows exactly: every range predicate is half-open
    // (`>= start`, `< end`), so the shared endpoint belongs to this window
    // only. While both ends were inclusive an event landing exactly on `from`
    // was counted in both, and the trend was a comparison of two overlapping
    // sets.
    //
    // `pinned` is the one thing the instants cannot say for themselves: a
    // window someone picked off the calendar is compared against the calendar
    // days before it, and a preset — a duration ending now — against the same
    // duration. See previousWindow.
    previous: previousWindow(from, to, tz, { pinned: range === CUSTOM_RANGE }),
  };
}

/**
 * One render is 17 statements: both statistics windows, the series, one per
 * breakdown dimension, and the goals. They are independent index ranges over
 * the same window, so they go out together and the render costs the slowest of
 * them rather than their sum.
 *
 * Every one of them is drawn. `channels` is the thirteenth and the newest — the
 * column has been computed at ingest since the schema change and rendered
 * nowhere — and it is the panel that makes this dashboard's acquisition figures
 * true rather than an artefact of pages-per-visit. The seven acquisition
 * dimensions cost slightly *less* than they did before they were scoped to
 * `is_new_session`: the qual is a heap-side filter over rows the range scan has
 * already fetched, and it halves what reaches the aggregate.
 */
export async function loadDashboard(wid: string, url: URL) {
  const filters = resolveFilters(url);
  const window = { start: filters.from, end: filters.to };

  const [stats, previousStats, series, breakdowns, events] = await Promise.all([
    metrics.statistics(wid, window),
    metrics.statistics(wid, filters.previous),
    metrics.timeseries(wid, { ...window, unit: filters.unit, tz: filters.tz }),
    metrics.breakdowns(wid, window),
    metrics.customEvents(wid, window),
  ]);

  return {
    range: filters.range,
    from: filters.from,
    to: filters.to,
    unit: filters.unit,
    tz: filters.tz,
    stats,
    previousStats,
    series,
    breakdowns,
    events,
  };
}
