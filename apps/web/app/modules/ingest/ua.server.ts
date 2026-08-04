import type { DeviceType, ScreenClass } from "~/db/schema";
import { isbot } from "isbot";
import { UAParser } from "ua-parser-js";

/** The five columns a request's client can be described by. */
export type UserAgent = {
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device: DeviceType | null;
};

/**
 * Client hints are opt-in above a low-entropy floor: `Sec-CH-UA`, `-Mobile` and
 * `-Platform` arrive unasked on every secure request, while the platform version
 * and the model only start arriving after a server has advertised that it wants
 * them.
 *
 * The ask never lands here, and cannot. A browser stores an `Accept-CH` only
 * from a *top-level navigation* response, and this origin serves nothing but
 * third-party subresource beacons — and even a populated store would not send a
 * high-entropy hint to a cross-origin subresource without a
 * `Permissions-Policy` delegation from the customer's own document, which
 * Aurora has no way to set. `Critical-CH` carries the same navigation-only
 * constraint.
 *
 * So this is kept for the browsers that *do* honour it — a self-hosted install
 * whose dashboard and collector share an origin gets the store populated by the
 * dashboard's own navigations — and the version it cannot deliver is read from
 * the client instead: the tracker calls `getHighEntropyValues` and posts the
 * answer in the beacon body, which `parseUserAgent` prefers over both.
 */
export const ACCEPT_CH =
  "Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Mobile, Sec-CH-UA-Model";

const EMPTY: UserAgent = {
  browser: null,
  browser_version: null,
  os: null,
  os_version: null,
  device: null,
};

/**
 * `Sec-CH-UA` is a structured-header list of `"brand";v="major"` pairs, read
 * pair by pair rather than by splitting on commas: the brand is a quoted string
 * and the version parameter belongs to the brand it follows, and a split loses
 * that pairing the moment a value contains a separator.
 */
const BRAND = /"([^"]*)";\s*v="([^"]*)"/g;

/**
 * Chromium pads the list with a randomised GREASE brand whose name is some
 * punctuation-mangled spelling of "Not A Brand" — `"Not;A=Brand"`,
 * `"(Not(A:Brand"`, `";Not A Brand"` — specifically so that servers cannot
 * match the list literally. Dropping the punctuation is what collapses every
 * spelling of it back to one value.
 */
const isGrease = (brand: string) =>
  brand
    .replace(/[^a-z]/gi, "")
    .toLowerCase()
    .includes("notabrand");

/**
 * The two brands `Sec-CH-UA` spells differently from every UA string.
 *
 * `Sec-CH-UA` is only sent on secure requests, so without this the same browser
 * lands in two buckets decided by the customer page's TLS posture: "Google
 * Chrome" from an https page and "Chrome" from an http one, and the browsers
 * breakdown shows Chrome twice with its counts split. The UA-string spelling
 * wins because it is the one that also appears on every row written before
 * client hints existed.
 *
 * ua-parser's Mobile-prefixed names ("Mobile Chrome", "Mobile Safari") are not
 * in here on purpose: that is a distinction it draws deliberately, and the
 * `device` column already carries the same answer in a form a panel can group
 * on.
 */
const BRAND_NAMES = new Map([
  ["google chrome", "Chrome"],
  ["microsoft edge", "Edge"],
]);

/**
 * Every Chromium browser lists "Chromium" beside its own brand, and the two
 * carry different versions — Opera 119 ships on Chromium 133 — so the entry
 * that is not Chromium is both the more useful name and the owner of the
 * version that goes with it.
 */
function pickBrand(header: string | null) {
  const brands = [...(header ?? "").matchAll(BRAND)]
    .map(([, name, version]) => ({
      name: BRAND_NAMES.get(name.trim().toLowerCase()) ?? name.trim(),
      version,
    }))
    .filter((brand) => brand.name && !isGrease(brand.name));

  return brands.find((brand) => brand.name !== "Chromium") ?? brands[0] ?? null;
}

/**
 * Major only. A full version string buckets one row per Chrome patch release
 * and turns the browsers panel into a histogram of noise.
 */
function major(version: string | null | undefined): string | null {
  return /^\d+/.exec(version?.trim() ?? "")?.[0] ?? null;
}

/**
 * Windows reports a platform version from a table Microsoft publishes rather
 * than its own name: 13 and above is Windows 11, 1 through 12 is Windows 10,
 * and 0.x is 7, 8 or 8.1 which the header genuinely cannot tell apart. Taking
 * the major would file those readers under "Windows 15".
 */
function platformVersion(platform: string, version: string): string | null {
  if (platform !== "Windows") {
    return major(version);
  }

  const reported = Number(major(version));

  if (!Number.isFinite(reported) || reported < 1) {
    return null;
  }

  return reported >= 13 ? "11" : "10";
}

const unquote = (value: string | null) =>
  (value ?? "").trim().replace(/^"|"$/g, "").trim();

/**
 * `?0` is not enough to say desktop: Chrome sends it on Android tablets, which
 * would file every one of them as a desktop. A model is only ever populated on
 * the form factors that have one, so it settles the same question for the
 * tablets that do not run Android.
 */
function hintedDevice(
  mobile: string,
  platform: string,
  model: string
): DeviceType | null {
  if (mobile === "?1") {
    return "mobile";
  }

  if (mobile !== "?0") {
    return null;
  }

  return platform === "Android" || model ? "tablet" : "desktop";
}

/**
 * Only the fields the hints could actually answer, so the caller can tell "the
 * browser did not say" from "the browser said nothing useful".
 */
export function parseClientHints(headers: Headers): Partial<UserAgent> {
  const hints: Partial<UserAgent> = {};
  const brand = pickBrand(headers.get("sec-ch-ua"));

  if (brand) {
    hints.browser = brand.name;
    hints.browser_version = major(brand.version);
  }

  const platform = unquote(headers.get("sec-ch-ua-platform"));

  if (platform && platform !== "Unknown") {
    hints.os = platform;
    hints.os_version = platformVersion(
      platform,
      unquote(headers.get("sec-ch-ua-platform-version"))
    );
  }

  const device = hintedDevice(
    (headers.get("sec-ch-ua-mobile") ?? "").trim(),
    platform,
    unquote(headers.get("sec-ch-ua-model"))
  );

  if (device) {
    hints.device = device;
  }

  return hints;
}

/**
 * ua-parser leaves the type undefined for desktops, and also reports console,
 * smarttv, wearable, xr and embedded — none of which the device check
 * constraint accepts. A television is not a desktop, so it is stored as unknown
 * rather than folded into whichever of the three is closest.
 */
function deviceOf(type: string | undefined): DeviceType | null {
  if (!type) {
    return "desktop";
  }

  return type === "mobile" || type === "tablet" ? type : null;
}

/**
 * Names survive a missing version. The previous implementation dropped the
 * whole dimension unless both halves were present, which silently loses more
 * data every year as UA reduction freezes and hides version numbers.
 */
export function parseUserAgentString(ua: string | null | undefined): UserAgent {
  const value = ua?.trim();

  if (!value) {
    return EMPTY;
  }

  const result = new UAParser(value).getResult();

  return {
    browser: result.browser.name ?? null,
    browser_version: major(result.browser.major ?? result.browser.version),
    os: result.os.name ?? null,
    os_version: major(result.os.version),
    device: deviceOf(result.device.type),
  };
}

/**
 * These four are the only values in the whole insert that come from a header
 * rather than from the request body, and the body's every string is byte-bound
 * before it reaches a column. Nothing bound these: `sec-ch-ua` is a client-set
 * header up to Node's ~16KB limit, and `pickBrand` handed the quoted brand
 * straight through, so one request could write 16KB into the browsers panel and
 * another 16KB into the OS panel, arbitrarily many distinct values each.
 *
 * Dropped rather than truncated — a 64-byte prefix of a 16KB brand is still a
 * value nobody browses with, and truncating would file it as a real one.
 */
const NAME_BYTES = 64;

const fits = (value: string | null) =>
  value !== null && Buffer.byteLength(value, "utf8") <= NAME_BYTES;

/**
 * A name with its version, or neither. Dropping the name has to drop the
 * version with it: "139" beside no browser is a row every panel groups into the
 * unknown bucket while still claiming a version was known.
 */
function named(name: string | null, version: string | null) {
  if (!fits(name)) {
    return { name: null, version: null };
  }

  return { name, version: fits(version) ? version : null };
}

/**
 * Payload hints first, request headers second, user agent string last.
 *
 * Each name is taken with its own version rather than field by field: the hint
 * list and the UA string disagree about Chromium forks — the hints say Opera
 * 119 where the string says Chrome 133 — so a per-field merge would attach one
 * browser's version to another browser's name.
 *
 * The OS version is the one field with three sources, because it is the one the
 * headers structurally cannot answer. `Accept-CH` is only honoured on a
 * top-level navigation response, which an ingest beacon never is, so
 * `Sec-CH-UA-Platform-Version` does not arrive while the low-entropy
 * `Sec-CH-UA-Platform` arrives unasked on every secure request — and UA
 * reduction has meanwhile frozen the string's platform version, so the fallback
 * is not merely thin but wrong: `Mac OS X 10_15_7` for every Chromium Mac
 * forever, `Windows NT 10.0` for 10 and 11 alike, `Android 10` for every phone.
 *
 * `reported` is what the tracker read out of
 * `navigator.userAgentData.getHighEntropyValues`, which needs no `Accept-CH`,
 * no delegation and no navigation, and exists on exactly the browsers whose
 * string is frozen. It arrives from the second pageview of a document onward
 * and not the first — the promise resolves a task after the view it would ride
 * on, and the tracker will not hold the view a fast bounce depends on for it —
 * so the branch below that reads it is the *reduction* of the defect and not
 * its removal: a one-pageview visit still lands on `fallback`, frozen value and
 * all. It is passed through the same Microsoft table the header
 * would have gone through, so "15.0.0" on Windows is the release 11 rather than
 * a version 15 nobody ships — and it is paired with whichever source named the
 * platform, since a browser cannot report one platform's version while running
 * on another.
 *
 * Below it the previous rule stands unchanged: the two remaining sources cannot
 * disagree about the platform the way they disagree about a Chromium fork, so
 * when they name the same OS the string's version is the same OS's version.
 */
export function parseUserAgent(
  headers: Headers,
  reported?: string | null
): UserAgent {
  const hints = parseClientHints(headers);
  const ua = parseUserAgentString(headers.get("user-agent"));

  const browser = named(
    hints.browser ?? ua.browser,
    hints.browser ? (hints.browser_version ?? null) : ua.browser_version
  );

  const platform = hints.os ?? ua.os;
  /**
   * Whether the payload answered at all, which is not the same as the answer
   * resolving to a release. A Windows platform version of 0.x means 7, 8 or
   * 8.1, and the table above deliberately reduces it to null — falling through
   * from there to the string would file a reader who is demonstrably not on
   * Windows 10 under Windows 10, which is the whole defect being repaired.
   */
  const answered = major(reported) !== null;
  // Never `major()` on its own: on Windows the platform version is an index
  // into a table Microsoft publishes rather than a release number, and taking
  // the major of it files those readers under "Windows 15".
  const reduced = platform ? platformVersion(platform, reported ?? "") : null;
  const fallback = hints.os
    ? (hints.os_version ?? (hints.os === ua.os ? ua.os_version : null))
    : ua.os_version;

  const os = named(platform, answered ? reduced : fallback);

  return {
    browser: browser.name,
    browser_version: browser.version,
    os: os.name,
    os_version: os.version,
    device: hints.device ?? ua.device,
  };
}

/**
 * The breakpoints are the layout's own (Tailwind's sm, lg and 2xl), because the
 * question this column answers is which layout the reader actually got — the
 * user agent only ever claims a form factor and cannot tell a 13" laptop from a
 * 32" monitor.
 */
export function screenClass(
  width: number | null | undefined
): ScreenClass | null {
  if (typeof width !== "number" || !Number.isFinite(width) || width <= 0) {
    return null;
  }

  if (width < 640) {
    return "mobile";
  }

  if (width < 1024) {
    return "tablet";
  }

  return width < 1536 ? "laptop" : "desktop";
}

/**
 * Wrapped rather than imported at the call site so the ingest route holds one
 * opinion about what a bot is, and so replacing the list later is a change to
 * this file. A crawler's request is answered 204 and written nowhere: it is not
 * a reader, and at the volume a well-indexed site attracts it is the difference
 * between a traffic chart and a crawl log.
 */
export function isBot(ua: string | null | undefined): boolean {
  return isbot(ua);
}
