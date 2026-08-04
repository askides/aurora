import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadDashboard, resolveFilters } from "../analytics.server";
import { isZoneName } from "../queries.server";
import { RANGES } from "../range";
import type { Breakdowns, Statistics } from "../types";

// What the panels contain is covered in metrics.test.ts. What is under test
// here is the window arithmetic, the shape the dashboard destructures, and that
// the loader asks for all of it at once.
vi.mock("../metrics.server", () => ({
  statistics: vi.fn(),
  timeseries: vi.fn(),
  breakdowns: vi.fn(),
  customEvents: vi.fn(),
}));

const metrics = await import("../metrics.server");

const url = (query: string) => new URL(`http://localhost/analytics${query}`);

/** resolveFilters throws a Response; unwrap it so assertions stay unconditional. */
const rejectionOf = (query: string) => {
  try {
    resolveFilters(url(query));
  } catch (error) {
    return error;
  }

  return undefined;
};

describe("resolveFilters", () => {
  it("defaults to the last 24 hours in UTC", () => {
    const filters = resolveFilters(url(""));

    expect(filters.range).toBe("LAST_24_HOURS");
    expect(filters.unit).toBe("hour");
    expect(filters.tz).toBe("UTC");
  });

  it("falls back to the default range for an unknown range key", () => {
    expect(resolveFilters(url("?range=LAST_CENTURY")).range).toBe(
      "LAST_24_HOURS"
    );
  });

  it("uses a day bucket for the multi-day ranges", () => {
    expect(resolveFilters(url("?range=LAST_7_DAYS")).unit).toBe("day");
    expect(resolveFilters(url("?range=LAST_30_DAYS")).unit).toBe("day");
  });

  it("keeps a valid IANA timezone", () => {
    expect(resolveFilters(url("?tz=Europe/Rome")).tz).toBe("Europe/Rome");
  });

  it("rejects a timezone that isn't a real zone with a 400", () => {
    // Guards the query that previously interpolated tz straight into SQL.
    const rejection = rejectionOf(
      "?tz=UTC%27%3B%20DROP%20TABLE%20events%3B%20--"
    );

    expect(rejection).toBeInstanceOf(Response);
    expect((rejection as Response).status).toBe(400);
  });

  it("produces a start before the end for every range", () => {
    for (const range of Object.keys(RANGES)) {
      const { from, to } = resolveFilters(url(`?range=${range}`));

      expect(from).toBeLessThan(to);
    }
  });
});

describe("resolveFilters with an explicit window", () => {
  const day = 86_400_000;
  const from = Date.UTC(2026, 0, 1);
  const to = Date.UTC(2026, 0, 8);

  it("takes from/to as epoch milliseconds", () => {
    const filters = resolveFilters(url(`?from=${from}&to=${to}`));

    expect(filters.range).toBe("CUSTOM");
    expect(filters.from).toBe(from);
    expect(filters.to).toBe(to);
  });

  it("puts the comparison window immediately before it", () => {
    const { previous } = resolveFilters(url(`?from=${from}&to=${to}`));

    expect(previous.end).toBe(from);
    expect(previous.start).toBe(from - (to - from));
  });

  it("buckets by hour up to two days and by day beyond that", () => {
    expect(resolveFilters(url(`?from=${from}&to=${from + day}`)).unit).toBe(
      "hour"
    );
    expect(resolveFilters(url(`?from=${from}&to=${from + 3 * day}`)).unit).toBe(
      "day"
    );
  });

  it("clips an end in the future back to now", () => {
    const ahead = Date.now() + 2 * day;
    const clipped = resolveFilters(
      url(`?from=${Date.now() - day}&to=${ahead}`)
    );

    expect(clipped.to).toBeLessThan(ahead);
  });

  it("overrides a range that is also in the URL", () => {
    const filters = resolveFilters(
      url(`?range=LAST_30_DAYS&from=${from}&to=${to}`)
    );

    expect(filters.range).toBe("CUSTOM");
    expect(filters.from).toBe(from);
  });

  it.each([
    ["a half written pair", `?from=${from}`],
    ["a non-numeric bound", `?from=nope&to=${to}`],
    ["a fractional bound", `?from=${from}.5&to=${to}`],
    ["an inverted window", `?from=${to}&to=${from}`],
    ["a window longer than a year", `?from=0&to=${to}`],
    [
      "a window entirely in the future",
      `?from=${Date.now() + day}&to=${Date.now() + 2 * day}`,
    ],
  ])("rejects %s with a 400", (_, query) => {
    const rejection = rejectionOf(query);

    expect(rejection).toBeInstanceOf(Response);
    expect((rejection as Response).status).toBe(400);
  });
});

/**
 * The comparison window is the previous *calendar* span, not the previous
 * `to - from` milliseconds, and the two differ on exactly the days a zone
 * changes offset. Every window below is one the range picker can produce:
 * `startOfZonedDay` to `endOfZonedDayExclusive` of a real transition day, in a
 * zone whose offset moves by a whole hour off a whole hour, off a half hour and
 * off a three-quarter hour. Every boundary here was checked against
 * `timezone(zone, ts)` in Postgres, which is what the buckets are grouped by.
 */
describe("resolveFilters comparison window across a DST transition", () => {
  const HOUR = 3_600_000;

  const DAYS = [
    {
      what: "the 23-hour day New York springs forward",
      tz: "America/New_York",
      from: Date.UTC(2026, 2, 8, 5), // 2026-03-08 00:00 EST
      to: Date.UTC(2026, 2, 9, 4), //   2026-03-09 00:00 EDT
      hours: 23,
      previousStart: Date.UTC(2026, 2, 7, 5), // 2026-03-07 00:00 EST
    },
    {
      what: "the 25-hour day New York falls back",
      tz: "America/New_York",
      from: Date.UTC(2026, 10, 1, 4), // 2026-11-01 00:00 EDT
      to: Date.UTC(2026, 10, 2, 5), //   2026-11-02 00:00 EST
      hours: 25,
      previousStart: Date.UTC(2026, 9, 31, 4), // 2026-10-31 00:00 EDT
    },
    {
      what: "the 23-hour day Adelaide springs forward, half an hour off the hour",
      tz: "Australia/Adelaide",
      from: Date.UTC(2026, 9, 3, 14, 30), // 2026-10-04 00:00 ACST (+09:30)
      to: Date.UTC(2026, 9, 4, 13, 30), //   2026-10-05 00:00 ACDT (+10:30)
      hours: 23,
      previousStart: Date.UTC(2026, 9, 2, 14, 30),
    },
    {
      what: "the 25-hour day Adelaide falls back, half an hour off the hour",
      tz: "Australia/Adelaide",
      from: Date.UTC(2026, 3, 4, 13, 30), // 2026-04-05 00:00 ACDT (+10:30)
      to: Date.UTC(2026, 3, 5, 14, 30), //   2026-04-06 00:00 ACST (+09:30)
      hours: 25,
      previousStart: Date.UTC(2026, 3, 3, 13, 30),
    },
    {
      what: "the 23-hour day Chatham springs forward, 45 minutes off the hour",
      tz: "Pacific/Chatham",
      from: Date.UTC(2026, 8, 26, 11, 15), // 2026-09-27 00:00 +12:45
      to: Date.UTC(2026, 8, 27, 10, 15), //   2026-09-28 00:00 +13:45
      hours: 23,
      previousStart: Date.UTC(2026, 8, 25, 11, 15),
    },
    {
      what: "the 25-hour day Chatham falls back, 45 minutes off the hour",
      tz: "Pacific/Chatham",
      from: Date.UTC(2026, 3, 4, 10, 15), // 2026-04-05 00:00 +13:45
      to: Date.UTC(2026, 3, 5, 11, 15), //   2026-04-06 00:00 +12:45
      hours: 25,
      previousStart: Date.UTC(2026, 3, 3, 10, 15),
    },
  ];

  beforeEach(() => {
    // Every transition above is in 2026 and the loader clips a window ending in
    // the future back to now, so the clock is parked past all of them.
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2027, 0, 1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const windowFor = (tz: string, from: number, to: number) =>
    resolveFilters(url(`?tz=${encodeURIComponent(tz)}&from=${from}&to=${to}`));

  it.each(DAYS)(
    "compares $what against the whole calendar day before it",
    ({ tz, from, to, hours, previousStart }) => {
      const { previous } = windowFor(tz, from, to);

      // The window really is the short or long day, not a plain 24 hours.
      expect(to - from).toBe(hours * HOUR);

      expect(previous.start).toBe(previousStart);
      expect(from - previous.start).toBe(24 * HOUR);
    }
  );

  it.each(DAYS)(
    "no longer counts back $what in milliseconds",
    ({ tz, from, to, hours }) => {
      const { previous } = windowFor(tz, from, to);

      // What the old arithmetic answered: an hour short of the previous day and
      // an hour adrift of its midnight, which is the ~4% phantom trend.
      expect(previous.start).not.toBe(from - (to - from));
      expect(Math.abs(previous.start - (from - (to - from)))).toBe(HOUR);
      expect(hours).not.toBe(24);
    }
  );

  it.each(DAYS)(
    "leaves no gap or overlap at $what's start",
    ({ tz, from, to }) => {
      const filters = windowFor(tz, from, to);

      // Half-open on both sides, so the shared instant belongs to the current
      // window alone and no event is counted twice or dropped.
      expect(filters.previous.end).toBe(filters.from);
      expect(filters.previous.end).toBe(from);
      expect(filters.to).toBe(to);
    }
  );

  it("shifts a multi-day window by whole days, not by its own length", () => {
    // 2026-03-02 through 2026-03-08 in New York: seven calendar days, 167 hours
    // because the last of them is the short one. The seven before it are a full
    // 168, and that is the comparison.
    const from = Date.UTC(2026, 2, 2, 5);
    const to = Date.UTC(2026, 2, 9, 4);
    const { previous } = windowFor("America/New_York", from, to);

    expect(to - from).toBe(167 * HOUR);
    expect(previous.start).toBe(Date.UTC(2026, 1, 23, 5));
    expect(from - previous.start).toBe(168 * HOUR);
  });

  it.each([
    ["Asia/Kolkata", Date.UTC(2026, 2, 7, 18, 30)],
    ["Asia/Kathmandu", Date.UTC(2026, 2, 7, 18, 15)],
  ])("still steps a plain day back in %s", (tz, from) => {
    const to = from + 24 * HOUR;
    const { previous } = windowFor(tz, from, to);

    // +05:30 and +05:45 never change offset, so every day is 24 hours and the
    // calendar answer and the millisecond answer are the same one.
    expect(previous.start).toBe(from - 24 * HOUR);
    expect(previous.end).toBe(from);
  });

  it("compares a window shorter than a day against the hours before it", () => {
    // No calendar day is spanned, so there is nothing to read off the calendar
    // and the millisecond arithmetic is the right answer.
    const from = Date.UTC(2026, 2, 8, 14);
    const to = from + 3 * HOUR;
    const { previous } = windowFor("America/New_York", from, to);

    expect(previous.start).toBe(from - 3 * HOUR);
    expect(previous.end).toBe(from);
  });
});

/**
 * The other half of the same question, and the half the block above cannot see.
 *
 * Every window up there runs midnight to midnight, which is the one shape the
 * calendar shift is right about — and the shape the range picker produces. A
 * preset is not that shape: "Last 24 hours" ends at whatever o'clock now is, so
 * its two ends sit at different times of day, and shifting *those* by calendar
 * days charges the comparison the length of a day the window may not even
 * contain. A window is either drawn on calendar squares or measured in
 * milliseconds, and the two are compared differently.
 */
describe("resolveFilters comparison window on a window that is not day-aligned", () => {
  const HOUR = 3_600_000;

  const windowFor = (tz: string, from: number, to: number) =>
    resolveFilters(url(`?tz=${encodeURIComponent(tz)}&from=${from}&to=${to}`));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2027, 0, 1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("compares a rolling day against the day before it, not against 25 hours", () => {
    // 2026-03-08 08:00 EDT -> 2026-03-09 08:00 EDT, the day after New York
    // springs forward: 24 real hours, both ends at 08:00 local. Shifting each
    // end back a calendar square and keeping the remainder as *elapsed* time
    // since local midnight answered 25 hours here, because 08:00 on the 8th is
    // seven hours into a day that lost one. A 24-hour window compared against
    // 25 is a −4% trend on Pageviews, Daily visitors and Sessions that nothing
    // in the data did.
    const from = Date.UTC(2026, 2, 8, 12);
    const to = Date.UTC(2026, 2, 9, 12);
    const { previous } = windowFor("America/New_York", from, to);

    expect(to - from).toBe(24 * HOUR);
    expect(previous.end).toBe(from);
    expect(from - previous.start).toBe(24 * HOUR);
  });

  it("never hands back a comparison window that starts after it ends", () => {
    // The degenerate case of the same arithmetic: the last hour of a 25-hour
    // local day. `from` is 24 hours into that day and the day before it is only
    // 24 long, so the shifted start overshot `from` and the window came back
    // inverted — which `withinRange` matches with zero rows and no error, so
    // every count tile rendered the label "New" and the rate tiles were
    // compared against nothing at all.
    const from = Date.UTC(2026, 10, 2, 4); // 2026-11-01 23:00 EST
    const to = Date.UTC(2026, 10, 2, 5); //   2026-11-02 00:00 EST
    const { previous } = windowFor("America/New_York", from, to);

    expect(previous.start).toBeLessThan(previous.end);
    expect(previous.end - previous.start).toBe(to - from);
  });

  it.each([
    // A tail of a 25-hour day, ending at the local midnight that closes it.
    ["America/New_York", Date.UTC(2026, 10, 2, 5)],
    ["Europe/Berlin", Date.UTC(2026, 9, 25, 23)],
    // A 23-hour day, where the shift errs the other way.
    ["Australia/Adelaide", Date.UTC(2026, 9, 4, 13, 30)],
    // An ordinary 24-hour day whose *predecessor* was 25 hours long: the window
    // holds no transition and was still compared against two hours of traffic.
    ["America/New_York", Date.UTC(2026, 10, 3, 5)],
  ])(
    "compares a sub-day window ending at midnight in %s against its own length",
    (tz, midnight) => {
      for (const minutes of [15, 30, 60, 120, 180]) {
        const from = midnight - minutes * 60_000;
        const { previous } = windowFor(tz, from, midnight);

        expect(previous.end).toBe(from);
        expect(previous.end - previous.start).toBe(midnight - from);
      }
    }
  );
});

/**
 * A preset is a duration ending now, and `RANGES[range].days` is documented as
 * the length of the window rather than a count of calendar squares to step
 * over. It was applied with date-fns `subDays`, which steps calendar squares in
 * the *host's* zone: the label read "Last 24 hours" over 23 or 25 of them, and
 * which one depended on the server rather than on `?tz`.
 */
describe("resolveFilters preset windows", () => {
  const HOUR = 3_600_000;

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["a spring-forward day", Date.UTC(2026, 2, 8, 12)],
    ["a fall-back day", Date.UTC(2026, 10, 1, 12)],
  ])("measures exactly what its label says on %s", (_, now) => {
    // The suite is pinned to TZ=UTC, under which a host-zone leak is invisible
    // by construction — and the leak is the defect. On a server running
    // America/New_York these two instants are the ones `subDays` got wrong:
    // stepping a calendar square back off 07:00 lands on a wall clock at the
    // other side of the transition, so "Last 24 hours" spanned 25 hours here
    // and 23 on the March instant. The 24 consecutive hourly values of `to`
    // around each transition are all affected, twice a year, in every zone a
    // self-hoster might set.
    const host = process.env.TZ;

    process.env.TZ = "America/New_York";
    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      for (const [key, range] of Object.entries(RANGES)) {
        const { from, to } = resolveFilters(url(`?range=${key}`));

        expect(to - from).toBe(range.days * 24 * HOUR);
      }
    } finally {
      process.env.TZ = host;
    }
  });

  it("stays a duration on the one instant a day it looks like a calendar day", () => {
    // Once every 24 hours `now` lands on a local midnight and a preset resolves
    // to a window shaped exactly like a picked calendar day. Reading the shape
    // rather than being told which kind it is gave "Last 24 hours" a 23-hour
    // comparison here — found against Postgres on uniform hourly traffic, at
    // this instant and at no other in the fortnight around the transition.
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 2, 10, 4)); // 2026-03-10 00:00 EDT

    const { from, to, previous } = resolveFilters(
      url("?range=LAST_24_HOURS&tz=America/New_York")
    );

    expect(to - from).toBe(24 * HOUR);
    expect(previous.end - previous.start).toBe(24 * HOUR);
  });

  it("compares a preset against a window of the same length", () => {
    // Both ends of a rolling window sit at the same time of day and neither is
    // a midnight, so there is no calendar span to read: the comparison is the
    // same duration laid end to end, and it tiles.
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 10, 2, 12));

    for (const key of Object.keys(RANGES)) {
      const { from, to, previous } = resolveFilters(
        url(`?range=${key}&tz=America/New_York`)
      );

      expect(previous.end).toBe(from);
      expect(previous.end - previous.start).toBe(to - from);
    }
  });
});

describe("loadDashboard", () => {
  const stats: Statistics = {
    visits: 3,
    uniqueVisits: 2,
    sessions: 2,
    bounces: 1,
    avgDuration: 1000,
  };

  const panels = {} as Breakdowns;

  beforeEach(() => {
    vi.mocked(metrics.statistics).mockResolvedValue(stats);
    vi.mocked(metrics.timeseries).mockResolvedValue([]);
    vi.mocked(metrics.breakdowns).mockResolvedValue(panels);
    vi.mocked(metrics.customEvents).mockResolvedValue([]);
  });

  it("serves the dashboard every field it destructures", async () => {
    const data = await loadDashboard("wid", url("?range=LAST_7_DAYS&tz=UTC"));

    expect(new Set(Object.keys(data))).toEqual(
      new Set([
        "range",
        "from",
        "to",
        "unit",
        "tz",
        "stats",
        "previousStats",
        "series",
        "breakdowns",
        "events",
      ])
    );
    expect(data.breakdowns).toBe(panels);
    expect(data.unit).toBe("day");
  });

  it("asks for the previous window as well, so every figure can be a change", async () => {
    const { from, to } = await loadDashboard("wid", url("?range=LAST_7_DAYS"));

    expect(vi.mocked(metrics.statistics).mock.calls).toEqual(
      expect.arrayContaining([
        ["wid", { start: from, end: to }],
        ["wid", { start: from - (to - from), end: from }],
      ])
    );
  });

  it("asks the panels and the goals for the window the filters resolved to", async () => {
    const { from, to } = await loadDashboard("wid", url("?range=LAST_30_DAYS"));

    expect(vi.mocked(metrics.breakdowns)).toHaveBeenCalledWith("wid", {
      start: from,
      end: to,
    });
    expect(vi.mocked(metrics.customEvents)).toHaveBeenCalledWith("wid", {
      start: from,
      end: to,
    });
  });

  it("hands the series the bucket and the zone, which only the loader knows", async () => {
    const { from, to } = await loadDashboard(
      "wid",
      url("?range=LAST_7_DAYS&tz=Asia/Kolkata")
    );

    // The zone reaches Postgres as the operand of `AT TIME ZONE` and the unit
    // as date_trunc's, so dropping either here silently rebuckets the chart.
    expect(vi.mocked(metrics.timeseries)).toHaveBeenCalledWith("wid", {
      start: from,
      end: to,
      unit: "day",
      tz: "Asia/Kolkata",
    });
  });

  it("fans every panel out at once rather than one query after another", async () => {
    let inFlight = 0;
    let peak = 0;

    const tracked =
      <T>(value: T) =>
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);

        await Promise.resolve();

        inFlight -= 1;

        return value;
      };

    vi.mocked(metrics.statistics).mockImplementation(tracked(stats));
    vi.mocked(metrics.timeseries).mockImplementation(tracked([]));
    vi.mocked(metrics.breakdowns).mockImplementation(tracked(panels));
    vi.mocked(metrics.customEvents).mockImplementation(tracked([]));

    await loadDashboard("wid", url("?range=LAST_7_DAYS"));

    // Both windows of the statistics, the series, the panels and the goals.
    // Awaiting them in sequence would never put more than one in flight, and
    // would cost the first paint five round trips instead of the longest one.
    expect(peak).toBe(5);
  });
});

describe("isZoneName", () => {
  it.each(["UTC", "Europe/Rome", "America/New_York", "Etc/GMT+5"])(
    "accepts %s",
    (tz) => {
      expect(isZoneName(tz)).toBe(true);
    }
  );

  it.each([
    "Not/AZone",
    "'; DROP TABLE events; --",
    "",
    // Intl reads these as UTC+05:30 and UTC-08:00; Postgres reads the same two
    // strings POSIX-style, which is the other sign. The chart would be
    // relabelled by twice the offset with nothing to show for it.
    "+05:30",
    "-08:00",
  ])("rejects %s", (tz) => {
    expect(isZoneName(tz)).toBe(false);
  });
});
