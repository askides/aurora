import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";

/**
 * Thirty minutes of inactivity ends a session. The old client-side timer used
 * fifteen, which split a single reading session in two whenever someone left a
 * tab to make coffee, and inflated both the session count and the bounce rate.
 */
export const SESSION_WINDOW_MS = 30 * 60_000;

/**
 * The salt is the whole privacy claim: with it a visitor id can be recomputed
 * from an IP and a user agent, without it the ids are one-way. A deployment
 * that booted with this literal in production would be pseudonymising with a
 * value published on GitHub, so production refuses to start without its own.
 * Dev and test still boot with no configuration at all.
 */
const DEV_SALT = "aurora-development-salt";

function resolveSalt() {
  const configured = process.env.AURORA_SALT?.trim();

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AURORA_SALT is required in production: without it visitor ids would be derivable by anyone."
    );
  }

  return DEV_SALT;
}

const salt = resolveSalt();

/**
 * Which header carries the client's address, when the deployment knows.
 *
 * Every forwarding header is client-supplied until some hop overwrites it, so
 * "which one do I believe" is a fact about the topology in front of this
 * process and cannot be guessed from the request. A deployment that cares names
 * its trusted hop here — `AURORA_IP_HEADER=cf-connecting-ip` — and nothing else
 * is consulted.
 */
const CONFIGURED_HEADER = process.env.AURORA_IP_HEADER?.trim().toLowerCase();

/**
 * Said out loud at boot, because it cannot be fixed from inside this file.
 *
 * Every header consulted below is client-supplied until a hop overwrites it,
 * and whether a hop does is a fact about the topology that no request carries.
 * So on a deployment with nothing in front of this process, a caller who knows
 * only the public `wid` can put any address they like in `cf-connecting-ip`,
 * `x-real-ip` or `x-forwarded-for` and get it believed — a fresh `visitor_id`
 * and a fresh 240-token rate bucket per value, which inflates Daily Visitors,
 * Sessions and Bounce rate at will and takes the limiter out of the picture
 * entirely. Verified against a scratch database: five forged addresses produce
 * five visitors and five sessions, all flagged new.
 *
 * Distrusting the two single-address headers and keeping XFF — the obvious
 * half-measure — closes nothing: XFF alone reproduces it exactly, because with
 * no proxy the caller owns the rightmost entry too. The only sound rule is to
 * believe no header the operator has not named, and defaulting to that would
 * silently collapse every proxied install that relies on the guess below into
 * one visitor for the whole day. So the guess stays and the condition on it
 * gets stated, once, where an operator will see it.
 */
if (!CONFIGURED_HEADER && process.env.NODE_ENV === "production") {
  console.warn(
    "aurora: AURORA_IP_HEADER is not set. Visitor identity and rate limiting fall back to guessing among cf-connecting-ip, x-real-ip and x-forwarded-for — all of which any client can set. If this process is not behind a proxy that overwrites one of them, set AURORA_IP_HEADER to that header, or treat the visitor, session and bounce figures as forgeable."
  );
}

/**
 * The guess when it does not.
 *
 * `cf-connecting-ip` and `x-real-ip` first, and X-Forwarded-For last, which is
 * the opposite of the obvious order and the point of it: the first two are
 * single-address headers an edge *overwrites*, while Cloudflare and nginx's
 * `$proxy_add_x_forwarded_for` both *append* to whatever XFF the client sent.
 * Reaching XFF first means a caller who sends their own shadows the one header
 * that could have been trusted.
 */
const FALLBACK_HEADERS = ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"];

/**
 * The *rightmost* entry, not the leftmost.
 *
 * A proxy appends the address it saw itself, so the last element is the only
 * one this process has any evidence for; the front of the list is whatever the
 * caller typed. Single-hop — one nginx, one Cloudflare — makes that last entry
 * the real client, and behind two appending hops it degrades to the inner
 * proxy's address rather than to an attacker's choice. That is what
 * AURORA_IP_HEADER exists to fix.
 *
 * Then parsed as an IP and dropped if it is not one: this value is an HMAC
 * input and a rate-limit key, and neither may be an arbitrary-length string a
 * caller picked.
 */
function trustedHop(value: string | null): string {
  const last = value?.split(",").at(-1)?.trim() ?? "";

  return isIP(last) ? last : "";
}

/**
 * The address has exactly two legitimate uses — HMAC input below and the rate
 * limit key — and it is never persisted, never logged and never in a response.
 * Separate from visitorId only so those two rules can be tested.
 *
 * Empty rather than null when nothing forwards it: a deployment with no proxy
 * still gets one stable id per user agent, instead of a fresh visitor per
 * request.
 */
export function clientIp(headers: Headers): string {
  if (CONFIGURED_HEADER) {
    return trustedHop(headers.get(CONFIGURED_HEADER));
  }

  for (const header of FALLBACK_HEADERS) {
    const hop = trustedHop(headers.get(header));

    if (hop) {
      return hop;
    }
  }

  return "";
}

/**
 * Who the rate limiter is counting.
 *
 * The address when there is one. When there is not — no proxy in front, which
 * is a supported deployment — the alternative to *some* key is one bucket for
 * the whole process, and an attacker who drains it takes every site's ingest
 * down with it. The user agent is the only other thing the request carries that
 * a caller does not pick per-request for free, so it stands in: the blackout
 * radius shrinks from "every visitor" to "every visitor on this browser build",
 * which is the same granularity `visitorId` already degrades to.
 *
 * Hashed and truncated because the raw header is up to ~16KB and the key is
 * held in a Map for two minutes.
 */
export function clientKey(headers: Headers): string {
  const ip = clientIp(headers);

  if (ip) {
    return ip;
  }

  return `ua:${createHash("sha256")
    .update(headers.get("user-agent") ?? "")
    .digest("base64url")
    .slice(0, 16)}`;
}

/**
 * A daily pseudonym, not a device id: the UTC date is part of the message, so
 * every id rotates at midnight and yesterday's cannot be correlated with
 * today's. That rotation is what makes the identifier consent-free, and it is
 * also the dashboard's definition of a unique visitor — "first seen today".
 *
 * Scoped by website so the same reader on two sites hosted by the same instance
 * is two unrelated visitors. 22 base64url characters is 132 bits, which is far
 * past collision range for a day of one site's traffic and shorter than the
 * full digest the index would otherwise carry.
 */
export function visitorId(
  headers: Headers,
  websiteId: string,
  at: Date = new Date()
): string {
  const message = [
    at.toISOString().slice(0, 10),
    websiteId,
    clientIp(headers),
    headers.get("user-agent") ?? "",
  ].join(":");

  return createHmac("sha256", salt)
    .update(message)
    .digest("base64url")
    .slice(0, 22);
}
