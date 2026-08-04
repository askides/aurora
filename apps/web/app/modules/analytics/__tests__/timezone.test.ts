import { describe, expect, it } from "vitest";
import {
  bucketsWithin,
  canonicalTimeZone,
  endOfZonedDayExclusive,
  isValidTimeZone,
  listTimeZones,
  startOfZonedDay,
  zonedCalendarDay,
  zonedWallClock,
} from "../timezone";

/** The calendar hands back local-field Dates; the suite runs with TZ=UTC. */
const picked = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day);

describe("startOfZonedDay", () => {
  it("snaps to midnight in the charted zone, not the browser's", () => {
    // Aug 1 in Rome is CEST, so its midnight is 22:00 the previous day in UTC.
    // date-fns startOfDay would answer Aug 1 00:00 UTC — two hours of Aug 1 in
    // the zone the chart is bucketed by, missing from the window.
    expect(startOfZonedDay(picked(2026, 8, 1), "Europe/Rome")).toBe(
      Date.UTC(2026, 6, 31, 22)
    );
    expect(startOfZonedDay(picked(2026, 8, 1), "America/New_York")).toBe(
      Date.UTC(2026, 7, 1, 4)
    );
    expect(startOfZonedDay(picked(2026, 8, 1), "Asia/Tokyo")).toBe(
      Date.UTC(2026, 6, 31, 15)
    );
  });

  it("uses the offset in force on the day, not one sampled elsewhere", () => {
    // Rome is UTC+1 in January and UTC+2 in August. A single offset for the
    // whole year is wrong for half of it.
    expect(startOfZonedDay(picked(2026, 1, 15), "Europe/Rome")).toBe(
      Date.UTC(2026, 0, 14, 23)
    );
  });

  it("resolves the midnight that DST skips forward", () => {
    // Santiago starts DST at 24:00 on the first Saturday of September, so
    // 2026-09-06 has no 00:00 at all — it opens at 01:00. The first instant of
    // the day is what the window has to start at, and 01:00 CLST is 04:00Z.
    //
    // This asserted 03:00Z, which is 23:00 on the *fifth* — the answer a
    // backwards resolution gives, and an hour of the previous day inside a
    // window the button labels as one. Postgres resolves the same clock
    // forward, both in `timestamp AT TIME ZONE` and in the `date_trunc` the
    // buckets are grouped by, so the two have to meet here or the chart is
    // drawn against a day the stats were not counted over.
    expect(startOfZonedDay(picked(2026, 9, 6), "America/Santiago")).toBe(
      Date.UTC(2026, 8, 6, 4)
    );
  });

  it.each([
    ["America/Havana", 2026, 3, 8, Date.UTC(2026, 2, 8, 5)],
    ["Atlantic/Azores", 2026, 3, 29, Date.UTC(2026, 2, 29, 1)],
  ])(
    "starts %s's %i-%i-%i at the first instant the day has",
    (tz, year, month, day, expected) => {
      // The other two zones the picker offers whose transition opens at 00:00.
      // Each read as the previous day's 23:00 before the gap was resolved
      // forward, which is what made a single click on the transition day label
      // itself "Mar 7 - Mar 8" and, on reopening the picker, apply as 47 hours.
      expect(startOfZonedDay(picked(year, month, day), tz)).toBe(expected);
    }
  );

  it("keeps a gap day exactly one hour short", () => {
    // The consequence the window has to show: Havana's 2026-03-08 is 23 hours,
    // not the 24 a backwards midnight made it.
    const start = startOfZonedDay(picked(2026, 3, 8), "America/Havana");
    const end = endOfZonedDayExclusive(picked(2026, 3, 8), "America/Havana");

    expect(end - start).toBe(82_800_000);
  });

  it("still takes the first of two instants when midnight is ambiguous", () => {
    // Havana ends DST at 01:00, so 2025-11-02 has one midnight and the day is
    // 25 hours. Only the *gap* resolution changed; this one already agreed with
    // Postgres and has to keep agreeing.
    const start = startOfZonedDay(picked(2025, 11, 2), "America/Havana");
    const end = endOfZonedDayExclusive(picked(2025, 11, 2), "America/Havana");

    expect(start).toBe(Date.UTC(2025, 10, 2, 4));
    expect(end - start).toBe(90_000_000);
  });
});

describe("endOfZonedDayExclusive", () => {
  it("ends on the next day's first instant in that zone", () => {
    // Not 23:59:59.999. The query layer's range predicate is half-open, so the
    // boundary belongs to the *next* window and this one stops just short of
    // it; the last-millisecond form left that millisecond in neither.
    expect(endOfZonedDayExclusive(picked(2026, 8, 1), "Europe/Rome")).toBe(
      Date.UTC(2026, 7, 1, 22)
    );
    expect(endOfZonedDayExclusive(picked(2026, 8, 1), "Asia/Tokyo")).toBe(
      Date.UTC(2026, 7, 1, 15)
    );
  });

  it("meets the next day's start exactly, so windows tile", () => {
    // The whole point: consecutive days share one instant, which is a member of
    // the later window only. A gap of a millisecond here is an event nothing
    // counts; an overlap is an event counted twice.
    expect(endOfZonedDayExclusive(picked(2026, 8, 1), "Europe/Rome")).toBe(
      startOfZonedDay(picked(2026, 8, 2), "Europe/Rome")
    );
  });

  it("rolls over the end of a month", () => {
    expect(endOfZonedDayExclusive(picked(2026, 8, 31), "Europe/Rome")).toBe(
      startOfZonedDay(picked(2026, 9, 1), "Europe/Rome")
    );
  });

  it("spans exactly a day across one with no transition in it", () => {
    const start = startOfZonedDay(picked(2026, 8, 1), "Europe/Rome");
    const end = endOfZonedDayExclusive(picked(2026, 8, 1), "Europe/Rome");

    // Exactly 86_400_000, which is what makes `previous = [from - span, from)`
    // the calendar day before rather than a day shifted off its own midnight.
    expect(end - start).toBe(86_400_000);
  });

  it("spans an hour less across a spring-forward day", () => {
    // The picker's label says "Mar 29" either way; the window behind it is a
    // 23 hour day, which is the answer Postgres buckets to as well.
    const start = startOfZonedDay(picked(2026, 3, 29), "Europe/Rome");
    const end = endOfZonedDayExclusive(picked(2026, 3, 29), "Europe/Rome");

    expect(end - start).toBe(82_800_000);
  });

  it("spans an hour more across a fall-back day", () => {
    const start = startOfZonedDay(picked(2026, 10, 25), "Europe/Rome");
    const end = endOfZonedDayExclusive(picked(2026, 10, 25), "Europe/Rome");

    expect(end - start).toBe(90_000_000);
  });

  it("ends a day whose own midnight does not exist", () => {
    // Beirut's 2026-03-29 opens at 01:00 and is 23 hours long; the day after it
    // is ordinary. Both edges have to come from the zone, not from arithmetic.
    const start = startOfZonedDay(picked(2026, 3, 29), "Asia/Beirut");
    const end = endOfZonedDayExclusive(picked(2026, 3, 29), "Asia/Beirut");

    expect(start).toBe(Date.UTC(2026, 2, 28, 22));
    expect(end).toBe(Date.UTC(2026, 2, 29, 21));
  });
});

describe("zonedCalendarDay", () => {
  it("round-trips the window back to the squares that produced it", () => {
    // Reopening the picker must not move the selection: the seeded day has to
    // be the one Apply would send back.
    const from = startOfZonedDay(picked(2026, 8, 1), "Asia/Tokyo");
    const day = zonedCalendarDay(from, "Asia/Tokyo");

    expect([day.getFullYear(), day.getMonth() + 1, day.getDate()]).toEqual([
      2026, 8, 1,
    ]);
    expect(startOfZonedDay(day, "Asia/Tokyo")).toBe(from);
  });

  it("reads the instant in the charted zone, which can be another date", () => {
    // 23:30 UTC is already the next day in Tokyo, and the previous one in
    // Los Angeles. The calendar square depends on the zone, not on the host.
    const at = Date.UTC(2026, 7, 1, 23, 30);

    expect(zonedCalendarDay(at, "Asia/Tokyo").getDate()).toBe(2);
    expect(zonedCalendarDay(at, "America/Los_Angeles").getDate()).toBe(1);
  });

  it("seeds the last square from the instant before an exclusive end", () => {
    // How the picker reopens on the window it sent. The boundary itself is
    // already the next day, so reading it directly would move the selection
    // forward one square every time the popover was opened.
    const to = endOfZonedDayExclusive(picked(2026, 8, 1), "Asia/Tokyo");

    expect(zonedCalendarDay(to, "Asia/Tokyo").getDate()).toBe(2);
    expect(zonedCalendarDay(to - 1, "Asia/Tokyo").getDate()).toBe(1);
  });
});

describe("zonedWallClock", () => {
  it("relabels an instant as the clock it reads in the zone", () => {
    // The space the chart's buckets live in: wall clock in `tz`, labelled UTC.
    expect(zonedWallClock(Date.UTC(2026, 7, 1, 22), "Europe/Rome")).toBe(
      Date.UTC(2026, 7, 2)
    );
    expect(zonedWallClock(Date.UTC(2026, 7, 1, 22), "UTC")).toBe(
      Date.UTC(2026, 7, 1, 22)
    );
  });

  it("puts a window's exclusive end on the bucket that follows the last one", () => {
    // Which is what lets the dashboard drop the empty bucket generate_series
    // pads onto the end of a whole-day range.
    const to = endOfZonedDayExclusive(picked(2026, 8, 1), "America/New_York");

    expect(zonedWallClock(to, "America/New_York")).toBe(Date.UTC(2026, 7, 2));
  });
});

/** A bucket as the query hands it over: wall clock in `tz`, labelled UTC. */
const bucket = (iso: string) => ({ timeseries: iso, count: 0 });

describe("bucketsWithin", () => {
  it("drops the empty bucket the padding adds past an exclusive end", () => {
    // A single day picked in New York: the series is padded to
    // date_trunc('hour', to), and `to` is the next day's midnight, so Postgres
    // returns a 25th bucket that the counts beside it can never fill.
    const to = endOfZonedDayExclusive(new Date(2026, 7, 1), "America/New_York");

    const series = [
      bucket("2026-08-01T23:00:00.000Z"),
      bucket("2026-08-02T00:00:00.000Z"),
    ];

    expect(bucketsWithin(series, to, "America/New_York")).toEqual([series[0]]);
  });

  it("keeps the partial bucket a preset's window ends inside", () => {
    // Presets end at `now`, mid-bucket. That bucket is the one with today's
    // traffic in it and dropping it would blank the right-hand end of the chart.
    const to = Date.parse("2026-08-04T17:42:00.000Z");
    const series = [
      bucket("2026-08-04T14:00:00.000Z"),
      bucket("2026-08-04T15:00:00.000Z"),
    ];

    expect(bucketsWithin(series, to, "Europe/Rome")).toEqual(series);
  });

  it("compares in the charted zone rather than against the raw instant", () => {
    // 19:00 in Rome is 17:00 UTC. Comparing the bucket label — a wall clock —
    // against the instant would cut the last two hours off every European
    // afternoon and be invisible to anyone testing from UTC.
    const to = Date.parse("2026-08-04T17:42:00.000Z");
    const series = [
      bucket("2026-08-04T18:00:00.000Z"),
      bucket("2026-08-04T19:00:00.000Z"),
      bucket("2026-08-04T20:00:00.000Z"),
    ];

    expect(bucketsWithin(series, to, "Europe/Rome")).toEqual([
      series[0],
      series[1],
    ]);
  });

  it("leaves a window that ends on no bucket at all alone", () => {
    const series = [bucket("2026-08-01T00:00:00.000Z")];

    expect(
      bucketsWithin(series, Date.parse("2026-09-01T00:00:00Z"), "UTC")
    ).toEqual(series);
  });
});

/**
 * Verified against postgres:16 (docker-compose.yml): the runtime offers these 18
 * names, Postgres refuses every one of them with `time zone "…" not recognized`,
 * and every name on the right is accepted. The full 419-name list `listTimeZones`
 * produces after substitution was checked the same way — all accepted, and all
 * agreeing with Intl on the wall clock in January and in July.
 */
const LEGACY_ALIASES: [string, string][] = [
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
];

/** The wall clock a zone reads at an instant, to the minute. */
const reading = (tz: string, at: number) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    dateStyle: "short",
    timeStyle: "short",
  }).format(at);

describe("isValidTimeZone", () => {
  it("accepts the names the pickers offer and rejects the rest", () => {
    expect(isValidTimeZone("Europe/Rome")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });

  it.each(LEGACY_ALIASES)(
    "rejects %s, which Postgres has no such zone for",
    (alias) => {
      // Intl says yes to all of these, which is exactly the defect: this
      // predicate is what the query layer's isZoneName defers to before the
      // name reaches `AT TIME ZONE`, so accepting one turned a bad ?tz= into a
      // 500 out of Postgres instead of a 400 out of the loader.
      expect(isValidTimeZone(alias)).toBe(false);
    }
  );

  it.each(LEGACY_ALIASES)(
    "accepts the zone %s is offered as",
    (_, canonical) => {
      expect(isValidTimeZone(canonical)).toBe(true);
    }
  );

  it.each([
    "US/Eastern",
    "Canada/Pacific",
    "Brazil/East",
    "Australia/NSW",
    "Japan",
    "Poland",
    "GB-Eire",
    "Asia/Ulan_Bator",
    "Europe/Uzhgorod",
    "Antarctica/South_Pole",
  ])("rejects the tzdata backward link %s", (legacy) => {
    // Node's ICU accepts all ~80 of these and the Postgres image carries none
    // of them: Debian ships the `backward` links in a separate tzdata-legacy
    // package. Answering true here let `?tz=US/Eastern` past the loader and
    // straight into `AT TIME ZONE`, and loadDashboard runs from the anonymous
    // loader in analytics.public.tsx — an unauthenticated 500 on a shared link
    // where the contract promises a 400.
    expect(isValidTimeZone(legacy)).toBe(false);
  });

  it("still accepts the POSIX offset names, which both sides read alike", () => {
    // Deliberately allowed by the query layer: a *name*, unlike a bare `+05:30`
    // offset, which Intl and Postgres read with opposite signs.
    expect(isValidTimeZone("Etc/GMT+5")).toBe(true);
    expect(isValidTimeZone("Etc/GMT-14")).toBe(true);
    expect(isValidTimeZone("Etc/UTC")).toBe(true);
    expect(isValidTimeZone("Etc/GMT+15")).toBe(false);
  });
});

describe("canonicalTimeZone", () => {
  it.each(LEGACY_ALIASES)("rewrites %s to %s", (alias, canonical) => {
    expect(canonicalTimeZone(alias)).toBe(canonical);
  });

  it("leaves anything else alone, including what it cannot vouch for", () => {
    // It canonicalises; it does not validate. The caller checks.
    expect(canonicalTimeZone("Europe/Rome")).toBe("Europe/Rome");
    expect(canonicalTimeZone("UTC")).toBe("UTC");
    expect(canonicalTimeZone("Not/AZone")).toBe("Not/AZone");
  });

  it.each(LEGACY_ALIASES)(
    "keeps %s and %s the same zone at every month of the year",
    (alias, canonical) => {
      // The substitution is only safe because the pair are one zone under two
      // names. Checked against Intl rather than against the table that claims
      // it, so a typo in the table fails here and not on someone's dashboard.
      for (let month = 0; month < 12; month++) {
        const at = Date.UTC(2026, month, 15, 12);

        expect(reading(canonical, at)).toBe(reading(alias, at));
      }
    }
  );
});

describe("listTimeZones", () => {
  const zones = listTimeZones();

  it("offers nothing the loader would then refuse", () => {
    // The invariant the picker rests on: every row it draws is a name the
    // dashboard can actually be loaded with.
    expect(zones.filter((zone) => !isValidTimeZone(zone))).toEqual([]);
  });

  it("offers the canonical name instead of dropping the region", () => {
    // Filtering alone would have been the smaller change and the wrong one:
    // these are the only entries the runtime lists for India, Ukraine and
    // Argentina, so dropping them leaves those readers with no zone to pick.
    for (const [alias, canonical] of LEGACY_ALIASES) {
      expect(zones).not.toContain(alias);
      expect(zones).toContain(canonical);
    }
  });

  it("leads with UTC, then rises strictly — sorted and never repeated", () => {
    // Substituting a name moves it (America/Buenos_Aires becomes
    // America/Argentina/Buenos_Aires), so the list has to be re-sorted after,
    // and a runtime that one day lists an alias beside its target must not
    // offer the same zone twice.
    const [first, ...rest] = zones;

    expect(first).toBe("UTC");
    expect(rest.every((zone, i) => i === 0 || rest[i - 1] < zone)).toBe(true);
    expect(rest).not.toContain("UTC");
  });
});
