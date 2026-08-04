/**
 * The wire shapes the shipped routes accept — `collectSchema` in
 * apps/web/app/routes/collect.ts and `durationSchema` in
 * apps/web/app/routes/collect.duration.ts. Neither side can move alone.
 *
 * Every optional field there is `.optional()` and not `.nullish()`, so an
 * explicit `null` is a 422 where an omitted key is fine. They carry a literal
 * `| undefined` here so a payload can be built as one object literal and let
 * `JSON.stringify` drop whatever the page did not have.
 */

export type PropValue = string | number | boolean;

/** Scalars only: the route rejects null, arrays and nested objects outright. */
export type Props = Record<string, PropValue>;

export type Revenue = {
  amount: number;
  /** ISO-4217. Uppercased server-side, so the case sent here does not matter. */
  currency: string;
};

export type Utm = {
  source?: string | undefined;
  medium?: string | undefined;
  campaign?: string | undefined;
  term?: string | undefined;
  content?: string | undefined;
};

/**
 * POST /collect. `viewport` is deliberately absent: the schema accepts it and
 * the insert never reads it, so it is bytes on every beacon for nothing.
 */
export type CollectPayload = {
  wid: string;
  type: "pageview" | "event";
  vid: string;
  path: string;
  /**
   * "This pageview's path was wrong, here is where the redirect settled." The
   * route moves the row `vid` already names instead of inserting a second one,
   * so it carries nothing but the three fields that address that row and the
   * path replacing it — everything else on it was right the first time.
   */
  corrects?: boolean | undefined;
  name?: string | undefined;
  referrer?: string | undefined;
  language?: string | undefined;
  /**
   * `navigator.userAgentData.getHighEntropyValues(["platformVersion"])`, when
   * the browser has one and has answered in time.
   *
   * It is on the wire because the header carrying the same value cannot be: a
   * browser stores an `Accept-CH` ask only from a top-level navigation
   * response, and this origin serves nothing but beacons, so
   * `Sec-CH-UA-Platform-Version` never arrives however politely it is asked
   * for. Raw rather than reduced — "15.0.0", not "15" — because Windows
   * reports a platform version from a table Microsoft publishes, where 15 means
   * Windows 11, and only the server holds that table.
   */
  platformVersion?: string | undefined;
  screen?: number | undefined;
  utm?: Utm | undefined;
  props?: Props | undefined;
  revenue?: Revenue | undefined;
};

/**
 * POST /collect/duration. The event id never leaves the server, so `vid` is
 * how a beacon names the row it is timing.
 */
export type DurationPayload = {
  wid: string;
  vid: string;
  duration: number;
};

export type EventOptions = {
  props?: Props | undefined;
  revenue?: Revenue | undefined;
};

/**
 * `q` is the async stub's queue: a site that installs the usual one-liner
 * ahead of the bundle collects calls into it, and this script drains it.
 *
 * `loaded` is how a second copy of the bundle recognises a first one that has
 * already taken the page. Only the live API carries it — a refusal installs an
 * inert function without it, so a deployment that declined for one reason does
 * not silence a copy that would have declined for none.
 */
export type AuroraApi = ((name: string, options?: EventOptions) => void) & {
  q?: unknown[];
  loaded?: boolean;
};
