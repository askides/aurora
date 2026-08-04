/**
 * The dashboard's time filter vocabulary, shared by the loader and the picker.
 *
 * Kept out of analytics.server for the reason given in types.ts: the picker
 * needs these names, and importing them shouldn't drag the loader into the
 * browser bundle.
 *
 * Every window ultimately reaches the loader as a `from`/`to` pair of epoch
 * milliseconds. A preset is only shorthand for one that rolls with the clock,
 * which is why it stays in the URL as a name instead of being expanded: a
 * shared "last 7 days" link should mean the last seven days to whoever opens
 * it, not the week the sender was looking at.
 */
/**
 * `days` is the length of the window, and it has to be the number the label
 * says. These read 6 and 29 — inherited from the pre-rewrite loader, where they
 * were chosen so the day-bucketed chart would draw exactly 7 and 30 bars. That
 * is an argument about the shape of a chart, and it was paid for with every
 * figure on the dashboard: "Last 7 days" measured 144 hours, and the trend
 * beneath it compared 144 hours against the 144 before them. The chart now pads
 * from the window it is given, so the bar count follows the window rather than
 * the window following the bar count.
 */
export const RANGES = {
  LAST_24_HOURS: { label: "Last 24 hours", short: "24h", days: 1 },
  LAST_7_DAYS: { label: "Last 7 days", short: "7d", days: 7 },
  LAST_30_DAYS: { label: "Last 30 days", short: "30d", days: 30 },
} as const;

export type RangeKey = keyof typeof RANGES;

/** What the loader reports when the window came from an explicit from/to. */
export const CUSTOM_RANGE = "CUSTOM";

export const DEFAULT_RANGE: RangeKey = "LAST_24_HOURS";

export function isRangeKey(value: string | null): value is RangeKey {
  return value !== null && value in RANGES;
}

/** A preset by name, or a window pinned to two instants. */
export type RangeSelection = { range: RangeKey } | { from: number; to: number };
