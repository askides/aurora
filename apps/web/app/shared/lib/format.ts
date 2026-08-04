/**
 * Display formatting shared by every panel.
 *
 * Everything pins an explicit locale and time zone. The server renders these
 * strings too, so anything that reads the host's locale or clock would produce
 * markup that doesn't survive hydration.
 */

// Type-only, so nothing in db/schema.ts is pulled into the client bundle: it is
// the declaration of the closed set `formatChannel` labels, and the point is
// that adding a channel there breaks the label map here.
import type { ChannelType } from "~/db/schema";

const LOCALE = "en-US";

const compact = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const plain = new Intl.NumberFormat(LOCALE);

/** Full precision, grouped. For tooltips and single figures. */
export function formatNumber(value: number) {
  return plain.format(Math.round(value));
}

/** Abbreviated. For anything that has to fit in a column or a tile. */
export function formatCompactNumber(value: number) {
  return value < 1000 ? plain.format(Math.round(value)) : compact.format(value);
}

/** Stands in for a figure that was never measured, as opposed to one that is 0. */
export const NO_DATA = "—";

/**
 * Milliseconds to the shortest unambiguous form: 0s, <1s, 48s, 3m 07s, 1h 04m.
 *
 * Null is a window in which nothing reported a duration. It renders as a dash
 * rather than "0s", which would claim every visit ended the instant it began.
 *
 * A *measured* fraction of a second is the same trap one step down. Rounding to
 * whole seconds turned a real 400ms average into the same "0s" this function
 * reserves for a real zero, so a site of instant bounces read as one whose
 * beacons never fired. Anything that measured something but rounds away is
 * "<1s": still short, and still not nothing.
 */
export function formatDuration(ms: number | null) {
  if (ms === null) {
    return NO_DATA;
  }

  const totalSeconds = Math.max(0, Math.round(ms / 1000));

  if (totalSeconds < 60) {
    return totalSeconds === 0 && ms > 0 ? "<1s" : `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** A share of a whole, already expressed as a 0–1 ratio. */
export function formatPercent(ratio: number, fractionDigits = 1) {
  if (!Number.isFinite(ratio)) {
    return "0%";
  }

  const percent = ratio * 100;
  // Whole numbers don't need a decimal; 12.5% does.
  const digits = Number.isInteger(percent) ? 0 : fractionDigits;

  return `${percent.toFixed(digits)}%`;
}

export type Trend = {
  /** Signed ratio, e.g. 0.14 for +14%. Null when there is no baseline. */
  ratio: number | null;
  direction: "up" | "down" | "flat";
  label: string;
};

/**
 * Past this the exact figure has stopped saying anything a reader can use, and
 * it is wide enough to be a layout problem: a stat tile that grew from one
 * pageview to fifty thousand rendered "+4999900%" as an unbreakable monospace
 * run inside a card that clips its overflow, so the number was cut mid-digit.
 * Everything below the cap fits in "+999.9%".
 */
const TREND_CAP = 10;

/**
 * Change against the previous window, for a metric that is a *count*.
 *
 * Growth from zero has no defined percentage, so it reports as "New" rather
 * than the infinity a naive (current - previous) / previous would produce.
 * That word is why this is only for counts: "New" describes a pageview count
 * that had nothing before it, and describes nothing at all about a rate or an
 * average that happened to sit at zero. Those have `pointChange` and
 * `durationChange`, which state their change in their own units and never need
 * a baseline to divide by.
 */
export function trend(current: number, previous: number): Trend {
  if (previous === 0) {
    return current === 0
      ? { ratio: 0, direction: "flat", label: "No change" }
      : { ratio: null, direction: "up", label: "New" };
  }

  const ratio = (current - previous) / previous;

  if (Math.abs(ratio) < 0.0005) {
    return { ratio: 0, direction: "flat", label: "0%" };
  }

  const sign = ratio > 0 ? "+" : "−";
  const direction = ratio > 0 ? ("up" as const) : ("down" as const);

  if (Math.abs(ratio) >= TREND_CAP) {
    return { ratio, direction, label: `${ratio > 0 ? ">+" : "<−"}999%` };
  }

  return {
    ratio,
    direction,
    label: `${sign}${formatPercent(Math.abs(ratio), 1)}`,
  };
}

/**
 * Change between two *rates*, in percentage points.
 *
 * A rate divided by a rate is a number nobody wants: a bounce rate that went
 * from 0% to 10% is not "New", and one that went from 1% to 2% did not double
 * in any sense a reader would act on. The difference of two shares is defined
 * everywhere, including at a zero baseline, and "pts" is what keeps it from
 * being read as the rate itself.
 */
export function pointChange(current: number, previous: number): Trend {
  const points = (current - previous) * 100;

  // Below this the tile would render a signed "0.0 pts", which reads as a
  // change that did not happen.
  if (Math.abs(points) < 0.05) {
    return { ratio: 0, direction: "flat", label: "0 pts" };
  }

  return {
    ratio: current - previous,
    direction: points > 0 ? "up" : "down",
    label: `${points > 0 ? "+" : "−"}${Math.abs(points).toFixed(1)} pts`,
  };
}

/**
 * Change between two *durations*, as a duration.
 *
 * Same reasoning as `pointChange`: an average is not a count, so a window whose
 * previous average was zero has not gained a duration "New". "+12s" is the
 * answer in the unit the tile above it is already showing.
 */
export function durationChange(current: number, previous: number): Trend {
  const delta = current - previous;

  // Rounds away at the resolution formatDuration prints, so there is nothing to
  // report; stating "+<1s" would make a rounding artifact look like a move.
  if (Math.round(Math.abs(delta) / 1000) === 0) {
    return { ratio: 0, direction: "flat", label: "0s" };
  }

  return {
    ratio: previous === 0 ? null : delta / previous,
    direction: delta > 0 ? "up" : "down",
    label: `${delta > 0 ? "+" : "−"}${formatDuration(Math.abs(delta))}`,
  };
}

/**
 * Chart bucket labels.
 *
 * Bucket timestamps are wall-clock time in the viewer's zone, labelled as UTC
 * by the query layer (see metrics.server.ts). Reading them back in UTC is what
 * recovers the wall clock — using the host zone would shift every label.
 */
export function formatBucket(iso: string, unit: "hour" | "day") {
  const date = new Date(iso);

  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    ...(unit === "hour"
      ? { hour: "numeric", hour12: true }
      : { month: "short", day: "numeric" }),
  }).format(date);
}

/**
 * The same label with the day attached, for an hourly axis that spans one.
 *
 * A rolling window does not start on a bucket boundary, so the 24 hour preset
 * pads to 25 hourly buckets and the first and last are the same hour of the
 * clock — the axis drew "2 PM" at both ends, an hour apart in name and a day
 * apart in fact. The chart qualifies only the labels that would otherwise
 * repeat, so a window that reads unambiguously stays as short as it was.
 */
export function formatBucketWithDay(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "numeric",
    hour12: true,
  }).format(new Date(iso));
}

/** The long form used inside chart tooltips, where there is room to be exact. */
export function formatBucketLong(iso: string, unit: "hour" | "day") {
  const date = new Date(iso);

  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(unit === "hour" ? { hour: "numeric", hour12: true } : {}),
  }).format(date);
}

/**
 * A custom window, as the range picker labels it: "Aug 1 – Aug 4".
 *
 * The endpoints are instants, so they're read in the zone the dashboard is
 * being viewed in — the same one the buckets are grouped by. The year only
 * appears when the window spans two of them, where the day alone is ambiguous.
 *
 * `to` is exclusive, as it is everywhere else (the picker sends the next day's
 * first instant, and every range predicate is `< end`), so the last day *in*
 * the window is the one the instant before it falls on. Formatting the boundary
 * itself labelled a single picked day "Aug 1 – Aug 2".
 */
export function formatDateRange(from: number, to: number, tz: string) {
  // Not `to - 1` guarded on `to > from`: the loader clips the end to now, which
  // is never below the start — it rejects `from >= to` with a 400 first.
  const last = to - 1;

  const year = new Intl.DateTimeFormat(LOCALE, {
    timeZone: tz,
    year: "numeric",
  });
  const sameYear = year.format(from) === year.format(last);

  const day = new Intl.DateTimeFormat(LOCALE, {
    timeZone: tz,
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });

  const start = day.format(from);
  const end = day.format(last);

  return start === end ? start : `${start} – ${end}`;
}

/**
 * The referrer column's label.
 *
 * The dimension is now grouped over arrivals — `is_new_session`, the pageview
 * that opened the visit — so the empty bucket is a visit that arrived with no
 * external referrer rather than the pile of internal navigation it used to be.
 * It read "None or internal" for that reason, and before that "Direct", which
 * claimed the opposite of the truth: a site whose visitors all arrive from one
 * search engine and then read five pages showed that engine at 100 and "Direct"
 * at 400.
 *
 * Still not "Direct", even now that the scope is right, because that word means
 * something narrower one panel over: `channel` calls a visit `campaign` whenever
 * the link carried utm parameters, referrer or not, so a newsletter click sits
 * in this bucket and under Campaign in the other. Two panels using one word for
 * two different sets of visits is how a reader ends up comparing figures that
 * were never comparable. "No referrer" is what the bucket actually holds.
 */
export function formatReferrer(value: string) {
  return value || "No referrer";
}

/**
 * A `channel` value as a label.
 *
 * The column is a closed set (ChannelType, and a CHECK constraint means it), so
 * this is a capitalisation and not a lookup — spelled out rather than
 * `charAt(0).toUpperCase()` so that a channel added to the schema shows up here
 * as a compile error instead of rendering lowercase next to four capitalised
 * siblings.
 */
const CHANNEL_LABELS: Record<ChannelType, string> = {
  direct: "Direct",
  search: "Search",
  social: "Social",
  referral: "Referral",
  campaign: "Campaign",
};

export function formatChannel(value: string) {
  return CHANNEL_LABELS[value as ChannelType] ?? (value || "Unknown");
}

const regions = new Intl.DisplayNames([LOCALE], { type: "region" });

/**
 * An ISO-3166-1 alpha-2 code as a country name.
 *
 * The edge headers are the only geography Aurora has and they speak codes; the
 * query layer keeps them raw on purpose, so this is where "IT" becomes "Italy".
 * `Intl.DisplayNames` throws on anything that isn't a well-formed region code
 * and echoes back one it simply doesn't know, so both degrade to the stored
 * value rather than to "undefined".
 */
export function formatCountry(code: string) {
  if (!code) {
    return "Unknown";
  }

  try {
    return regions.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/**
 * The regional-indicator pair for an alpha-2 code, which every platform that
 * has flags draws as one — no image, no request to a third party for it. The
 * ones that don't render letters, which is why it never carries the meaning on
 * its own.
 */
export function countryFlag(code: string) {
  if (!/^[a-z]{2}$/i.test(code)) {
    return "";
  }

  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(
      (letter) => 0x1f1e6 + letter.charCodeAt(0) - 65
    )
  );
}

/** Null marks a code Intl refused, so the refusal is paid for once per code. */
const currencies = new Map<string, Intl.NumberFormat | null>();

/**
 * One currency's total, in that currency.
 *
 * Takes a single amount and never a list: 49 EUR and 10 USD are two figures,
 * and adding them answered "59" in no unit at all — the bug the revenue column
 * was just corrected for. The code is whatever the site reported and nothing
 * verifies it against ISO-4217, so one Intl won't parse at all still renders
 * its amount rather than throwing the goal's row away.
 */
export function formatMoney(total: number, currency: string) {
  if (!currencies.has(currency)) {
    try {
      currencies.set(
        currency,
        new Intl.NumberFormat(LOCALE, { style: "currency", currency })
      );
    } catch {
      currencies.set(currency, null);
    }
  }

  const format = currencies.get(currency);

  return format ? format.format(total) : `${total.toFixed(2)} ${currency}`;
}

/**
 * Leading letters, for the tiles that stand in for logos and avatars.
 *
 * Sites take one letter: their names are often domains, and "Demo: docs.x.dev"
 * would otherwise render as "DD". People take two.
 */
export function initials(value: string, max = 2) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

/** Deterministic tint per label, drawn from the aurora ramp. */
export function tintIndex(value: string, buckets = 5) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hash) % buckets;
}
