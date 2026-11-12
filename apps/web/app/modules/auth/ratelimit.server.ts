import { RateLimiter } from "~/modules/ingest/ratelimit.server";
import { clientKey } from "~/modules/ingest/visitor.server";

/**
 * Throttles for the sign-in paths: password attempts, and both legs of an SSO
 * round trip. Separate buckets from ingest, because a site's tracker traffic
 * must not be able to lock its owner out of the dashboard, and the reverse.
 *
 * Per client, with ingest's notion of who the client is — the address
 * AURORA_IP_HEADER names, or a hash of the user agent where nothing forwards
 * one. Sized for a whole office behind one NAT address signing in at nine in
 * the morning, which a dozen-a-minute limit would not survive; it is a ceiling
 * on automation, not on people.
 */
const perClient = new RateLimiter({ ratePerMinute: 30, burst: 30 });

/**
 * Per account, for password attempts only. The per-client bucket alone does
 * not stop a guesser who rotates addresses — and on a deployment without
 * AURORA_IP_HEADER, the address is whatever the caller says it is. Five a
 * minute after a burst of ten is far more than a person mistyping and far
 * less than a dictionary. A token bucket refills, so the worst a third party
 * can do to the account's owner is slow them down, never lock them out.
 */
const perAccount = new RateLimiter({ ratePerMinute: 5, burst: 10 });

/**
 * Takes one attempt from the client's budget, and from the account's when one
 * is named. Resolves to the seconds to wait, or null when the attempt may go
 * ahead. The account bucket is only charged once the client one has allowed
 * the attempt, so a client already refused cannot also drain an account.
 */
export function throttleSignIn(request: Request, account?: string) {
  const client = perClient.take(clientKey(request.headers));

  if (!client.allowed) {
    return Math.ceil(client.retryAfterMs / 1000);
  }

  if (account) {
    const limit = perAccount.take(account);

    if (!limit.allowed) {
      return Math.ceil(limit.retryAfterMs / 1000);
    }
  }

  return null;
}

export function tooManyAttemptsMessage(seconds: number) {
  return `Too many sign-in attempts. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
}

/** For tests: every bucket starts full again. */
export function resetSignInThrottle() {
  perClient.reset();
  perAccount.reset();
}
