import type { CollectPayload, DurationPayload } from "./types";

/**
 * One-way, always. The routes answer 204 with a null body — no row, no event
 * id, no token — which is exactly what makes a beacon possible: there is
 * nothing to read back and therefore nothing that has to outlive the page.
 *
 * No `Content-Type` header on either path. A string body is labelled
 * `text/plain;charset=UTF-8`, which is CORS-safelisted, so the request goes out
 * on its own; declaring JSON would add a preflight to every beacon, including
 * the ones fired during unload where there is no time for two round trips.
 * `readPayload` parses the body rather than negotiating it for this reason.
 */
export const send = (
  url: string,
  payload: CollectPayload | DurationPayload
): void => {
  const body = JSON.stringify(payload);

  try {
    // sendBeacon is queued against the browser rather than the document, so it
    // survives the unload a flush is usually racing. `false` is a real refusal
    // — the queue is full — and not an error, hence the fall-through.
    if (navigator.sendBeacon(url, body)) {
      return;
    }
  } catch {
    // Absent (or refused by CSP): fetch still has to be tried.
  }

  try {
    // `keepalive` buys fetch the same survival. The rejection is swallowed on
    // purpose: an unhandled rejection is a message in the host page's console,
    // which is the one thing this script must never produce — and the throw is
    // caught for the same reason, so that a transport that is unavailable
    // costs a beacon and not the caller's next statement.
    void fetch(url, {
      method: "POST",
      body,
      keepalive: true,
      mode: "cors",
      credentials: "omit",
    }).catch(() => {});
  } catch {
    // Nowhere left to send it, and nowhere to report that either.
  }
};
