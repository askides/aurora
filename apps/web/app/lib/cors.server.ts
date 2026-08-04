import { siteHost, urlHost } from "./referrer.server";
import { ACCEPT_CH } from "./ua.server";

/**
 * The tracker script runs on third-party sites, so the collect routes are the
 * only part of the app that answers cross-origin. The previous deployment
 * applied these headers to every response via vercel.json; scoping them to the
 * two collect routes keeps the authenticated surface same-origin.
 */
const BASE: Record<string, string> = {
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  /**
   * Client hints above the low-entropy floor only start arriving once the
   * server has asked for them, and the beacon is often the only request this
   * origin ever makes — so the ask has to ride on the ingest response itself
   * rather than on a document response that never happens here.
   */
  "Accept-CH": ACCEPT_CH,
  /**
   * Sent unconditionally, including on the responses that carry no
   * Allow-Origin: the header a shared cache stores depends on the request's
   * Origin either way, and announcing that only when one was present is how a
   * cache ends up serving one site's allowance to another.
   */
  Vary: "Origin",
};

/**
 * The caller's own origin, never `*`. Echoing is what keeps a wildcard from
 * ever being combined with credentials, and `*` would in any case be a claim
 * about who may read a response whose only body is an error message.
 *
 * No Origin means no cross-origin check to satisfy — a server-to-server post,
 * or a beacon the browser sent without one — and naming an origin there would
 * be a header with nothing to answer.
 *
 * `null` is suppressed rather than echoed. It is a non-empty string, so it
 * would otherwise flow through here from a sandboxed iframe or a data:/file:
 * document and come back as `Access-Control-Allow-Origin: null` — a value every
 * opaque-origin document on the internet matches, and the one spelling of an
 * origin that names no site at all. `originAllowed` already rejects it on the
 * request side; this is the response side of the same answer, and it also
 * applies to the preflight, which has no body and so no `wid` to validate
 * against in the first place.
 */
export function corsHeaders(origin?: string | null): Record<string, string> {
  return origin && origin !== "null"
    ? { ...BASE, "Access-Control-Allow-Origin": origin }
    : BASE;
}

/**
 * Whether an Origin may post events for this website.
 *
 * Request-side half of the same policy the headers above express, kept beside
 * them so there is one answer to "is this caller ours" rather than one per
 * route. A *missing* Origin is the caller's to decide about — several beacon
 * paths and every server-to-server post omit it — but a present and foreign one
 * is somebody posting a neighbour's website id from their own page.
 */
export function originAllowed(origin: string, siteUrl: string): boolean {
  const host = urlHost(origin);

  if (!host) {
    return false;
  }

  if (host === siteHost(siteUrl)) {
    return true;
  }

  // The tracker is developed against a site served from the machine running the
  // app, which never matches the registered hostname. Production has no such
  // caller, and treating one as legitimate there would let any page opt itself
  // into a tenant by proxying through a local address.
  return (
    process.env.NODE_ENV !== "production" &&
    (host === "localhost" || host === "127.0.0.1" || host === "[::1]")
  );
}

/** Success carries no body: §1 forbids echoing the row, the id, or anything. */
export function corsNoContent(origin?: string | null) {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/** A preflight answer is the headers and nothing else, which is this exactly. */
export function preflight(origin?: string | null) {
  return corsNoContent(origin);
}

export function corsJson(data: unknown, status = 200, origin?: string | null) {
  return Response.json(data, { status, headers: corsHeaders(origin) });
}

/**
 * Nothing may leave a collect route by being thrown.
 *
 * React Router answers an uncaught resource-route error with
 * `returnLastResortErrorResponse`, which builds its own `text/plain` Response —
 * so none of the CORS headers those routes are careful about are on it, not even
 * `Vary: Origin`, and outside a production server mode the body is
 * `String(error)`. Drizzle's DrizzleQueryError stringifies to
 * `Failed query: <sql>\nparams: <bound params>`, which for the ingest INSERT is
 * the whole event row — visitor id, session id, path, referrer, props — echoed
 * to a third-party origin. Reachable without any misconfiguration: a deadlock
 * between the bounce clear and a concurrent insert, a statement timeout, a
 * dropped connection.
 *
 * It lives here rather than beside the routes because a route module may only
 * export `loader`, `action`, `middleware` and `headers` on top of client-safe
 * values: React Router strips those four from the client build and nothing else,
 * so a fifth export reaching for `corsJson` drags this whole module into the
 * browser graph and fails the client build outright.
 */
export function serverError(error: unknown, origin: string | null) {
  console.error("aurora: ingest failed", error);

  return corsJson({ message: "Internal error" }, 500, origin);
}
