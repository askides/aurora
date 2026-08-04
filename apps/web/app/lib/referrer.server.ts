import type { ChannelType } from "~/db/schema";

/**
 * Hosts that mean "arrived from a search results page", matched whole. The
 * hostname reaching this list is already lowercased and `www.`-less, so
 * `www.google.com` is `google.com` by the time it is looked up.
 *
 * Subdomains deliberately do not match. Three of these are portals before they
 * are engines: `mail.`, `docs.`, `drive.`, `groups.` and `news.google.com` all
 * sit under `google.com`, and `mail.` under the other two — so a suffix match
 * read a newsletter opened in Gmail, a link out of a shared document and a
 * headline off Google News as organic search. That is the one direction this
 * list must never be wrong in: the number is what SEO work gets sized off, and
 * inflating it with webmail is not visible from the panel.
 *
 * Which is why the search surfaces that are not the bare domain are spelled out
 * — `search.yahoo.com` is where Yahoo's results page sends people and
 * `m.baidu.com` is most of Baidu's — and why the list stays deliberately short
 * otherwise. The long tail of engines is a rounding error next to the cost of a
 * list nobody can read, and anything missing lands in `referral`, which is
 * wrong by one bucket rather than lost.
 */
export const SEARCH_HOSTS = [
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "search.yahoo.com",
  "yandex.com",
  "baidu.com",
  "m.baidu.com",
  "ecosia.org",
  "search.brave.com",
  "startpage.com",
  "qwant.com",
] as const;

/**
 * Referrers that are somebody's feed or timeline. These do match subdomains,
 * because none of them is a portal: `m.`, `l.`, `old.` and `music.` are the
 * same product on a different surface, and there is no webmail or document
 * host under any of these domains to be mistaken for one.
 */
export const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "t.co",
  "linkedin.com",
  "lnkd.in",
  "reddit.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "pinterest.com",
  "mastodon.social",
  "bsky.app",
  "threads.net",
  "news.ycombinator.com",
] as const;

/**
 * These three run one domain per country — google.de, yahoo.co.jp,
 * yandex.com.tr — and between them that is most of the search traffic outside
 * the US. Listing ~190 hostnames would bury the readable list above, so their
 * country domains are recognised by brand label instead.
 */
const SEARCH_BRANDS = new Set(["google", "yahoo", "yandex"]);

/**
 * `brand.tld` or `brand.cc.tld`, which is the shape every one of those takes —
 * and, since the brand has to be the whole first label, the same rule that lets
 * `google.de` in keeps `mail.google.de` out.
 */
const COUNTRY_DOMAIN = /^([a-z0-9-]+)\.(?:[a-z]{2,3}\.)?[a-z]{2,3}$/;

/** The campaign parameters as the tracker lifts them off `location.search`. */
export type Utm = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  term?: string | null;
  content?: string | null;
};

const stripWww = (host: string) =>
  host.startsWith("www.") ? host.slice(4) : host;

/**
 * A hostname is only comparable once it is lowercased, `www.`-less and free of
 * the trailing root dot that `example.com.` is still a legal spelling of.
 * Userinfo needs no stripping — `URL.hostname` never carries it — but that is
 * exactly why the parse goes through `URL` rather than a regex.
 */
const normalize = (hostname: string) =>
  stripWww(hostname.toLowerCase().replace(/\.$/, ""));

/**
 * Hostname of an absolute http(s) URL. The scheme check is not ceremony: the
 * legacy tracker wrote the sentinel string `Direct` into this field, and a bare
 * `example.com` is a relative path rather than a site, so neither may be
 * allowed to parse into a referrer that never happened.
 */
export function urlHost(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return normalize(url.hostname) || null;
  } catch {
    return null;
  }
}

/**
 * The same, for `websites.url`. That column is a free-text form field with no
 * validation, so `example.com` and `https://WWW.Example.org/blog` are both
 * already in the table: the scheme is supplied when it is missing rather than
 * treating half the rows as unusable.
 */
export function siteHost(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return urlHost(
    /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  );
}

const SEARCH = new Set<string>(SEARCH_HOSTS);

const isSocial = (host: string) =>
  SOCIAL_HOSTS.some((entry) => host === entry || host.endsWith(`.${entry}`));

const isSearchBrand = (host: string) => {
  const brand = COUNTRY_DOMAIN.exec(host)?.[1];

  return brand !== undefined && SEARCH_BRANDS.has(brand);
};

const hasUtm = (utm: Utm | null | undefined) =>
  utm !== null &&
  utm !== undefined &&
  Object.values(utm).some((value) => typeof value === "string" && value.trim());

/**
 * Any utm parameter outranks the referrer host: a campaign link opened from a
 * newsletter still reports whatever webmail the reader used, and the tag is the
 * deliberate answer while the host is an accident of delivery. That also covers
 * the `utm_medium=email|cpc|...` case, which cannot occur without a utm.
 */
export function channelOf(host: string | null, utm?: Utm | null): ChannelType {
  if (hasUtm(utm)) {
    return "campaign";
  }

  if (!host) {
    return "direct";
  }

  if (SEARCH.has(host) || isSearchBrand(host)) {
    return "search";
  }

  return isSocial(host) ? "social" : "referral";
}

/**
 * How the visit was acquired, resolved once at ingest.
 *
 * Only the host is kept. The full referrer is a path on somebody else's site —
 * a search query, a private forum thread, a document title in a URL — which is
 * data we would never display and must not hold just because the browser
 * offered it.
 *
 * A self-referral is internal navigation rather than acquisition, so it is
 * dropped to null and reads as `direct`; leaving it in would make every site's
 * own domain its top referrer.
 */
export function acquisition(input: {
  referrer?: string | null;
  siteUrl?: string | null;
  utm?: Utm | null;
}): { referrer_host: string | null; channel: ChannelType } {
  const host = urlHost(input.referrer);
  const site = siteHost(input.siteUrl);
  const external = host && host !== site ? host : null;

  return { referrer_host: external, channel: channelOf(external, input.utm) };
}
