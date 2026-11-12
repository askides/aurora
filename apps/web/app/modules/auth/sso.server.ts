import { isUniqueViolation } from "~/shared/lib/pg-errors.server";
import type { OidcSettings } from "./config.server";
import type { OidcFailure, OidcProfile } from "./oidc.server";
import {
  createUserWithIdentity,
  getUserByEmail,
  getUserByIdentity,
  getUserIdentity,
  linkIdentity,
} from "./queries.server";

/**
 * Which Aurora account a verified provider profile gets, if any.
 *
 * The rule the rest follows from: an identity is found by `(issuer, subject)`
 * and never by email. Aurora does not verify the addresses /signup accepts, so
 * an account holding someone's address proves nothing about who made it — and
 * attaching that person's SSO identity to it on arrival would hand the account,
 * and everything they then add to it, to whoever registered it first. An
 * existing account gets its identity from the account page instead, where its
 * owner has just proven they hold the password.
 */

export type SsoFailure =
  | OidcFailure
  | "unreachable"
  | "domain_not_allowed"
  | "email_missing"
  | "email_unverified"
  | "account_exists"
  | "identity_in_use"
  | "already_connected";

export type SsoOutcome =
  | { ok: true; userId: string }
  | { ok: false; failure: SsoFailure };

/** The sentence each failure is shown as, naming the provider. */
export function ssoFailureMessage(failure: SsoFailure, provider: string) {
  switch (failure) {
    case "expired":
      return "Your sign-in attempt expired. Please try again.";
    case "denied":
      return `${provider} did not complete the sign-in. Try again, or ask your administrator for access.`;
    case "failed":
      return `Signing in with ${provider} failed. Please try again.`;
    case "unreachable":
      return `${provider} could not be reached. Please try again in a moment.`;
    case "domain_not_allowed":
      return `This ${provider} account is not allowed to sign in to this instance.`;
    case "email_missing":
      return `${provider} did not share an email address, which Aurora needs to create your account.`;
    case "email_unverified":
      return `${provider} has not verified your email address yet.`;
    case "account_exists":
      return `An account with this email already exists. Sign in with your password, then connect ${provider} from your account page.`;
    case "identity_in_use":
      return `This ${provider} account is already connected to a different Aurora account.`;
    case "already_connected":
      return `Your account is already connected to a different ${provider} account. Disconnect it first.`;
  }
}

/**
 * The domain allowlist, applied to every SSO sign-in and connection, not only
 * the first. It only means anything for an address the provider vouches for:
 * a provider that lets users type their own email (multi-tenant Entra ID is
 * the well-known case) would otherwise admit anyone who typed one ending in an
 * allowed domain. So with an allowlist set, an unverified address is refused.
 */
export function isAllowedByDomain(profile: OidcProfile, allowed: string[]) {
  if (allowed.length === 0) {
    return true;
  }

  if (!profile.email || profile.emailVerified !== true) {
    return false;
  }

  return allowed.includes(profile.email.slice(profile.email.indexOf("@") + 1));
}

/** Signs in a returning identity, or creates the account for a new one. */
export async function signInWithIdentity(
  settings: OidcSettings,
  profile: OidcProfile
): Promise<SsoOutcome> {
  if (!isAllowedByDomain(profile, settings.allowedDomains)) {
    return { ok: false, failure: "domain_not_allowed" };
  }

  const identity = { issuer: profile.issuer, subject: profile.subject };
  const existing = await getUserByIdentity(identity);

  if (existing) {
    return { ok: true, userId: existing.id };
  }

  if (!profile.email) {
    return { ok: false, failure: "email_missing" };
  }

  // Only an explicit "no" is refused. Some providers never send the flag, and
  // since no account is ever found by its address the worst an unverified one
  // can do is occupy an address nobody else has registered.
  if (profile.emailVerified === false) {
    return { ok: false, failure: "email_unverified" };
  }

  if (await getUserByEmail(profile.email)) {
    return { ok: false, failure: "account_exists" };
  }

  try {
    const user = await createUserWithIdentity(
      {
        firstname: profile.firstname,
        lastname: profile.lastname,
        email: profile.email,
      },
      identity
    );

    return { ok: true, userId: user.id };
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    // Two callbacks for the same new identity can race — two tabs, a double
    // click on the provider's consent screen. The loser finds the winner's row
    // and signs into it; only an address taken by another account is an error.
    const winner = await getUserByIdentity(identity);

    return winner
      ? { ok: true, userId: winner.id }
      : { ok: false, failure: "account_exists" };
  }
}

/** Attaches an identity to the signed-in account `userId`. */
export async function connectIdentity(
  settings: OidcSettings,
  userId: string,
  profile: OidcProfile
): Promise<SsoOutcome> {
  if (!isAllowedByDomain(profile, settings.allowedDomains)) {
    return { ok: false, failure: "domain_not_allowed" };
  }

  const identity = { issuer: profile.issuer, subject: profile.subject };

  const owner = await getUserByIdentity(identity);

  if (owner) {
    return owner.id === userId
      ? { ok: true, userId }
      : { ok: false, failure: "identity_in_use" };
  }

  if (await getUserIdentity(userId)) {
    return { ok: false, failure: "already_connected" };
  }

  try {
    await linkIdentity(userId, identity);
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    // Lost a race against another connection of this identity or this account;
    // re-read to say which.
    const winner = await getUserByIdentity(identity);

    if (winner?.id === userId) {
      return { ok: true, userId };
    }

    return {
      ok: false,
      failure: winner ? "identity_in_use" : "already_connected",
    };
  }

  return { ok: true, userId };
}
