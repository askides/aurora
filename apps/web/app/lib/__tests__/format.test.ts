import { describe, expect, it } from "vitest";
import {
  countryFlag,
  durationChange,
  formatChannel,
  formatCountry,
  formatDateRange,
  formatDuration,
  formatMoney,
  formatReferrer,
  NO_DATA,
  pointChange,
  trend,
} from "../format";
import { endOfZonedDayExclusive, startOfZonedDay } from "../timezone";

describe("formatDuration", () => {
  it("tells a window that measured nothing from one that measured zero", () => {
    // The whole point of widening Statistics.avgDuration: an install whose
    // duration beacons never arrive used to read a confident "0s".
    expect(formatDuration(null)).toBe(NO_DATA);
    expect(formatDuration(0)).toBe("0s");
  });

  it.each([1, 400, 499])(
    "keeps a measured %ims from reading as the zero it is not",
    (ms) => {
      // Rounding to whole seconds put a real sub-second average into the exact
      // string this module reserves for "never measured is not zero" — a site
      // of instant bounces was indistinguishable from one with no beacons.
      expect(formatDuration(ms)).toBe("<1s");
    }
  );

  it.each([
    [500, "1s"],
    [48_000, "48s"],
    [187_000, "3m 07s"],
    [3_840_000, "1h 04m"],
  ])("renders %ims as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe("trend", () => {
  it("caps a percentage that has stopped meaning anything", () => {
    // A new site with one pageview last week and 50k this one rendered
    // "+4999900%" as an unbreakable monospace run inside an overflow-hidden
    // card, so it was clipped mid-digit rather than ellipsised.
    expect(trend(50_000, 1).label).toBe(">+999%");
    expect(trend(987_000_000, 1).label).toBe(">+999%");
    // The true ratio is still carried; only the label is capped.
    expect(trend(50_000, 1).ratio).toBe(49_999);
  });

  it("leaves everything under the cap exact", () => {
    expect(trend(1099, 1000).label).toBe("+9.9%");
    expect(trend(10_990, 1000).label).toBe("+999%");
    expect(trend(900, 1000).label).toBe("−10%");
  });
});

describe("pointChange", () => {
  it("states a rate's move in points rather than calling it New", () => {
    // A bounce rate that went from 0% to 10% is not new; it is ten points
    // worse. trend() reported "New" here, a word written for counts growing
    // from nothing and meaningless about a share.
    expect(pointChange(0.1, 0)).toEqual({
      ratio: 0.1,
      direction: "up",
      label: "+10.0 pts",
    });
    expect(pointChange(1, 0).label).toBe("+100.0 pts");
  });

  it("reads a fall as a fall and a standstill as no move", () => {
    expect(pointChange(0.12, 0.155).label).toBe("−3.5 pts");
    expect(pointChange(0.12, 0.12).direction).toBe("flat");
  });
});

describe("durationChange", () => {
  it("states an average's move in its own unit", () => {
    // Same reasoning as pointChange: an average visit whose previous window
    // read 0 has not become "New".
    expect(durationChange(12_000, 0).label).toBe("+12s");
    expect(durationChange(90_000, 30_000).label).toBe("+1m 00s");
    expect(durationChange(30_000, 90_000).direction).toBe("down");
  });

  it("does not report a difference formatDuration would round away", () => {
    expect(durationChange(48_400, 48_000)).toEqual({
      ratio: 0,
      direction: "flat",
      label: "0s",
    });
  });
});

describe("formatCountry", () => {
  it("names the alpha-2 codes the edge headers speak", () => {
    expect(formatCountry("IT")).toBe("Italy");
    expect(formatCountry("US")).toBe("United States");
  });

  it("labels the bucket that carries no country at all", () => {
    expect(formatCountry("")).toBe("Unknown");
  });

  it("falls back to what was stored rather than to undefined", () => {
    // The header is whatever the proxy in front of the app sent, so a value
    // Intl won't even parse as a region has to survive as itself.
    expect(formatCountry("not-a-code")).toBe("not-a-code");
  });
});

describe("countryFlag", () => {
  it("maps a code to its regional-indicator pair", () => {
    expect(countryFlag("IT")).toBe("\u{1F1EE}\u{1F1F9}");
  });

  it("has nothing to draw for the empty bucket", () => {
    expect(countryFlag("")).toBe("");
    expect(countryFlag("ZZZ")).toBe("");
  });
});

describe("formatMoney", () => {
  it("keeps every currency in its own unit", () => {
    // 49 EUR and 10 USD are two figures. Adding them answered "59" in no unit,
    // which is the bug this column was corrected for.
    expect(formatMoney(49, "EUR")).toBe("€49.00");
    expect(formatMoney(10, "USD")).toBe("$10.00");
  });

  it("renders a well-formed code Intl has no symbol for as the code", () => {
    // Intl's own separator here is a non-breaking space, which is the point of
    // letting it do the joining rather than doing it by hand.
    expect(formatMoney(12.5, "XBT")).toBe("XBT\u00a012.50");
  });

  it("still renders an amount in a code Intl refuses outright", () => {
    // ISO-4217 is a claim the tracker makes, not one anything verifies, and a
    // goal's total is worth more than its symbol.
    expect(formatMoney(12.5, "bitcoin")).toBe("12.50 bitcoin");
  });
});

/** A window as the picker sends it: zoned midnights, the end exclusive. */
const pickedWindow = (
  tz: string,
  from: [number, number],
  to: [number, number]
) => ({
  from: startOfZonedDay(new Date(2026, from[0] - 1, from[1]), tz),
  to: endOfZonedDayExclusive(new Date(2026, to[0] - 1, to[1]), tz),
});

describe("formatDateRange", () => {
  it("labels a single picked day as that day", () => {
    // The end is the next day's midnight, so reading it directly labelled one
    // day "Aug 1 – Aug 2" — a window one day wider than the one on screen.
    const { from, to } = pickedWindow("Europe/Rome", [8, 1], [8, 1]);

    expect(formatDateRange(from, to, "Europe/Rome")).toBe("Aug 1");
  });

  it("names the last day inside the window, not the boundary after it", () => {
    const { from, to } = pickedWindow("Europe/Rome", [8, 1], [8, 4]);

    expect(formatDateRange(from, to, "Europe/Rome")).toBe("Aug 1 – Aug 4");
  });

  it("reads both ends in the charted zone", () => {
    // Tokyo's Aug 1 – Aug 4 is one pair of instants; relabelled sixteen hours
    // west it starts on Jul 31, which is the point of passing the zone at all.
    const { from, to } = pickedWindow("Asia/Tokyo", [8, 1], [8, 4]);

    expect(formatDateRange(from, to, "Asia/Tokyo")).toBe("Aug 1 – Aug 4");
    expect(formatDateRange(from, to, "America/Los_Angeles")).toBe(
      "Jul 31 – Aug 4"
    );
  });

  it("qualifies the year when the window really spans two", () => {
    const from = startOfZonedDay(new Date(2026, 11, 30), "UTC");
    const to = endOfZonedDayExclusive(new Date(2027, 0, 2), "UTC");

    expect(formatDateRange(from, to, "UTC")).toBe("Dec 30, 2026 – Jan 2, 2027");
  });

  it("does not qualify one whose exclusive end merely crosses new year", () => {
    // New Year's Eve alone ends at Jan 1 00:00. Read as if it were in the
    // window, that end put a year on both labels and stretched a one-day pick
    // across two of them.
    const from = startOfZonedDay(new Date(2026, 11, 31), "UTC");
    const to = endOfZonedDayExclusive(new Date(2026, 11, 31), "UTC");

    expect(formatDateRange(from, to, "UTC")).toBe("Dec 31");
  });

  it("still names a single day when the end has been clipped to now", () => {
    // The loader clips a range ending today back to the current instant, so the
    // end reaching this is often not a midnight at all.
    const from = startOfZonedDay(new Date(2026, 7, 4), "Europe/Rome");

    expect(formatDateRange(from, from + 13 * 3_600_000, "Europe/Rome")).toBe(
      "Aug 4"
    );
  });
});

describe("formatReferrer", () => {
  it("does not call the empty bucket Direct, which it is not", () => {
    // The dimension is grouped over arrivals now, so the bucket is a visit that
    // began with no external referrer rather than the internal navigation it
    // used to be full of. Still not "Direct": one tab over, `channel` calls a
    // visit `campaign` whenever the link carried utm parameters, referrer or
    // not, so a newsletter click is in this bucket and under Campaign in that
    // one. Two panels spending one word on two different sets of visits is how
    // a reader ends up comparing figures that were never comparable.
    expect(formatReferrer("")).toBe("No referrer");
    expect(formatReferrer("news.ycombinator.com")).toBe("news.ycombinator.com");
  });
});

describe("formatChannel", () => {
  it("names the five values the column is constrained to", () => {
    // Stored lowercase, and the panel would otherwise print "search" under a
    // capitalised header beside four capitalised siblings.
    expect(
      ["direct", "search", "social", "referral", "campaign"].map(formatChannel)
    ).toEqual(["Direct", "Search", "Social", "Referral", "Campaign"]);
  });

  it("echoes anything the check constraint would have refused", () => {
    // Unreachable while events_channel_valid holds. It renders the stored value
    // rather than "undefined" if it ever stops holding, which is the same
    // bargain formatCountry makes with an unknown region code.
    expect(formatChannel("carrier-pigeon")).toBe("carrier-pigeon");
    expect(formatChannel("")).toBe("Unknown");
  });
});
