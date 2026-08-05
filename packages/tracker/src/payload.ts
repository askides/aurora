import type { Props, Revenue, Utm } from "./types";

/**
 * The route bounds every string by UTF-8 bytes, not characters, and one
 * over-long value fails the whole beacon rather than the field. `length` is
 * UTF-16 code units and disagrees with that on every non-ASCII page, so the
 * same units have to be counted here for a clamp to be worth anything.
 *
 * Three bytes per code unit is the worst UTF-8 can do (a surrogate pair costs
 * four across two units), so a browser without TextEncoder clamps early rather
 * than wrong.
 */
const encoder = typeof TextEncoder === "function" ? new TextEncoder() : null;

export const byteLength = (value: string): number =>
  encoder ? encoder.encode(value).length : value.length * 3;

/**
 * Converged rather than computed: scaling the cut by the byte ratio lands
 * inside the budget in a pass or two whatever the script. Cutting through an
 * emoji leaves a lone surrogate, which the route repairs to U+FFFD instead of
 * rejecting — which is the only reason clamping is safer than dropping.
 */
export const clamp = (value: string, max: number): string => {
  let cut = value.length > max ? value.slice(0, max) : value;

  for (let size = byteLength(cut); size > max; size = byteLength(cut)) {
    cut = cut.slice(0, Math.floor((cut.length * max) / size));
  }

  return cut;
};

/**
 * A fragment names a page only when it is a route.
 *
 * `#/pricing` is the entire address of a page under every hash router — Vue
 * Router's hash mode, Angular's HashLocationStrategy, `createHashRouter`, and
 * any static host that cannot serve a rewrite — so collapsing it left those
 * apps reporting one row per document, always `/`, and a bounce on every single
 * visit. `#pricing` is a position inside a page the visitor never left, and
 * counting it as a page would be the same defect pointing the other way.
 *
 * `#/` is also what keeps a secret out of the column. An OAuth implicit-flow or
 * magic-link callback arrives as `#access_token=…`, and a rule any looser than
 * this one would write bearer tokens into `events.path` and render them in a
 * dashboard panel; anything not route-shaped is dropped exactly as before.
 *
 * The route ends at the first `?`, `&` or `#`, and all three matter. `?` is
 * where a hash router puts its search params, so `#/orders?page=2` is one page.
 * The other two are how a token gets past the `#/` test: a redirect URI that
 * already has a fragment is undefined territory in RFC 6749, and providers
 * resolve it by appending — `#/callback&access_token=…` and
 * `#/callback#access_token=…` are both shapes a hash-routed app's OAuth
 * callback really lands on. A route segment holding a literal `&` is truncated
 * as the price, which is a rare page named slightly short against a bearer
 * token in a rendered column.
 *
 * The trailing slash is collapsed for the reason the pathname's is, and a bare
 * `#/` is the router's root — the page `/` already names — so it is dropped
 * rather than made a second row for the same page.
 */
const route = (hash: string): string => {
  if (!hash.startsWith("#/")) {
    return "";
  }

  // Sliced past the `#` before splitting, or the leading one is the first
  // separator and the whole route goes with it.
  const [head = ""] = hash.slice(1).split(/[?&#]/);
  const trimmed = head.replace(/\/+$/, "");

  return trimmed ? `#${trimmed}` : "";
};

/**
 * The server strips a query and an anchor too, and keeps a route-shaped
 * fragment on the same rule as `route` above — but it will not collapse a
 * trailing slash: `/pricing` and `/pricing/` are two rows in every breakdown
 * unless this collapses them, and only the client knows they are one page.
 *
 * The hash is a second argument rather than part of the first because the
 * caller reads `location.pathname` and `location.hash` separately, and because
 * every existing caller passing one string must keep meaning "no fragment".
 */
export const normalizePath = (pathname: string, hash = ""): string => {
  const [head = ""] = pathname.split(/[?#]/);
  const rooted = head.startsWith("/") ? head : `/${head}`;

  return clamp((rooted.replace(/\/+$/, "") || "/") + route(hash), 1024);
};

const UTM = ["source", "medium", "campaign", "term", "content"] as const;

/**
 * Only the five keys there are columns for, and only when one carries a value:
 * any non-empty utm forces `channel = "campaign"` server-side, so an object of
 * blanks would rewrite the acquisition channel of a visit that had none.
 */
export const readUtm = (search: string): Utm | undefined => {
  const params = new URLSearchParams(search);
  let utm: Utm | undefined;

  for (const key of UTM) {
    const value = params.get(`utm_${key}`)?.trim();

    if (value) {
      utm = utm ?? {};
      utm[key] = clamp(value, 255);
    }
  }

  return utm;
};

const MAX_PROPS = 24;

/**
 * One bad property fails the entire beacon server-side — a null, an array, a
 * nested object, a 25th key — and the event is worth more than the property
 * that broke it, so the offenders are dropped here instead. A caller that
 * forwards a user record verbatim gets a thinner event, not a lost one.
 */
export const boundProps = (input: unknown): Props | undefined => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }

  const props: Props = {};
  let count = 0;

  for (const [key, value] of Object.entries(input)) {
    if (count === MAX_PROPS) {
      break;
    }

    const bounded =
      typeof value === "string"
        ? clamp(value, 512)
        : typeof value === "boolean" ||
            (typeof value === "number" && Number.isFinite(value))
          ? value
          : undefined;

    if (bounded === undefined) {
      continue;
    }

    props[clamp(key, 64)] = bounded;
    count += 1;
  }

  // `{}` parses fine, but an empty object is a key on an unload beacon.
  return count > 0 ? props : undefined;
};

/** `numeric(14, 2)` overflows past this, and the route rejects rather than
 * truncates. Negatives are allowed: a refund is revenue too. */
const AMOUNT = 999_999_999_999.99;

/**
 * Both halves or neither. `revenue` present without a currency is a 422, and
 * so is a currency that is not three ASCII letters, so a half-filled object
 * from a caller costs the whole event unless it is dropped here.
 */
export const boundRevenue = (input: unknown): Revenue | undefined => {
  if (typeof input !== "object" || input === null) {
    return undefined;
  }

  const { amount, currency } = input as Partial<Revenue>;

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    Math.abs(amount) > AMOUNT
  ) {
    return undefined;
  }

  if (typeof currency !== "string" || !/^[a-z]{3}$/i.test(currency)) {
    return undefined;
  }

  return { amount, currency };
};
