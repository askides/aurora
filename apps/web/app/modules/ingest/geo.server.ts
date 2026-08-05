/**
 * Country comes from whichever edge is already terminating TLS, and never from
 * a GeoIP database: shipping one would mean a 60MB file, a licence, and a
 * monthly update job on every self-hosted install, to answer a question the
 * proxy in front of it usually already answered.
 *
 * A deployment with no geo-aware proxy therefore reports null everywhere, which
 * is a supported setup — the column is nullable and the breakdown treats the
 * bucket as unknown rather than as an error.
 */

/**
 * The header this deployment's edge writes, when it is not one of the three
 * below. Named rather than sniffed for the same reason AURORA_IP_HEADER is:
 * a header is only evidence if some hop is known to overwrite it.
 */
const CONFIGURED_HEADER =
  process.env.AURORA_COUNTRY_HEADER?.trim().toLowerCase();

/**
 * Each of these is written by one specific edge and stripped by it on the way
 * in, so a value that arrives in one is that edge's answer rather than the
 * caller's.
 *
 * The list used to also carry `x-country-code` and `x-geo-country`. Those are
 * generic names no particular proxy owns, which means nothing overwrites them
 * and they pass through from the client verbatim: on a deployment with no
 * geo-aware edge at all — the setup the docstring above calls supported — three
 * curl requests were enough to put a country of the caller's choosing into the
 * breakdown. The ALPHA2 shape check constrains the value and says nothing about
 * where it came from.
 */
export const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "fastly-geo-country",
] as const;

const headers = () =>
  CONFIGURED_HEADER
    ? ([CONFIGURED_HEADER] as readonly string[])
    : COUNTRY_HEADERS;

/**
 * ISO-shaped values that are not countries. Cloudflare answers XX when it
 * cannot place the client and T1 for Tor exit nodes; stored as-is they become a
 * top-five "country" on any site with privacy-minded readers.
 */
const PLACEHOLDERS = new Set(["XX", "T1"]);

const ALPHA2 = /^[A-Z]{2}$/;

/**
 * The first *usable* value wins rather than the first header present: an edge
 * that cannot place the client still sends its header, and a second proxy
 * further in may well know. Anything that is not two letters is dropped
 * silently, because nothing in the database checks this column.
 */
export function country(requestHeaders: Headers): string | null {
  for (const header of headers()) {
    const value = requestHeaders.get(header)?.trim().toUpperCase();

    if (value && ALPHA2.test(value) && !PLACEHOLDERS.has(value)) {
      return value;
    }
  }

  return null;
}
