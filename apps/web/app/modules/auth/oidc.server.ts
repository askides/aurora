import * as client from "openid-client";
import { createCookie, redirect } from "react-router";
import { z } from "zod";
import type { OidcSettings } from "./config.server";
import { cookieSecrets } from "./session.server";

/**
 * The OpenID Connect authorization code flow, with PKCE, state and nonce.
 *
 * Protocol only: this file turns a provider round trip into a verified profile
 * and has no opinion about which Aurora account that profile belongs to. That
 * decision is sso.server's.
 */

export type OidcIntent = "signin" | "link";

/**
 * What the browser carries between leaving for the provider and coming back.
 * Signed, so the intent and the user it was started for cannot be edited in
 * between; not encrypted, because none of it is a secret from the browser that
 * holds it — the PKCE verifier is only useful together with a code issued to
 * this same browser.
 */
type Flow = {
  state: string;
  nonce: string;
  verifier: string;
  /** Which of the configured redirect URIs this flow was sent through. */
  redirectUri: string;
  redirectTo: string;
  intent: OidcIntent;
  /** For `link`: the account that asked, checked again on the way back. */
  userId: string | null;
};

const flowSchema = z.object({
  state: z.string(),
  nonce: z.string(),
  verifier: z.string(),
  redirectUri: z.string(),
  redirectTo: z.string(),
  intent: z.enum(["signin", "link"]),
  userId: z.string().nullable(),
});

/**
 * Scoped to the two OIDC routes and gone after ten minutes, which is longer
 * than any provider's login page needs and short enough that an abandoned
 * attempt does not linger. `lax` is what lets it ride along on the provider's
 * top-level redirect back; `strict` would drop it on exactly that request.
 */
const flowCookie = createCookie("__aurora_oidc", {
  httpOnly: true,
  path: "/auth/oidc",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 10,
  secrets: cookieSecrets,
});

/** A `Set-Cookie` that removes the flow cookie, for every way out of the callback. */
export function clearFlowCookie() {
  return flowCookie.serialize("", { maxAge: 0 });
}

/**
 * The ID token from sign-in, kept for one purpose: `id_token_hint` when signing
 * out at the provider, which lets it end the right session without asking.
 *
 * In its own cookie rather than the session, and scoped to /signout, so the
 * kilobyte or two it weighs rides along on one request instead of every one —
 * and so a token too large for a cookie costs the hint rather than the
 * session. Same lifetime as the session it belongs to.
 */
const idTokenCookie = createCookie("__aurora_idt", {
  httpOnly: true,
  path: "/signout",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
  secrets: cookieSecrets,
});

/**
 * Browsers drop a cookie past about 4096 bytes without a word, so anything
 * near that is not set at all. Entra ID tokens carrying group claims get
 * there; a provider then shows its own "which account?" prompt instead.
 */
const MAX_COOKIE_BYTES = 3800;

/** A `Set-Cookie` holding the ID token, or null when it would not fit. */
export async function rememberIdToken(idToken: string | undefined) {
  if (!idToken) {
    return null;
  }

  const header = await idTokenCookie.serialize(idToken);

  return header.length <= MAX_COOKIE_BYTES ? header : null;
}

export function clearIdTokenCookie() {
  return idTokenCookie.serialize("", { maxAge: 0 });
}

/**
 * Where to send the browser to end its session at the provider, or null when
 * there is nothing to do there: logout turned off, a provider without an
 * end-session endpoint (Google has none), or one that cannot be reached — in
 * which case the Aurora session still ends and the user is told nothing worse
 * than they would have been before.
 *
 * The provider is asked to send the browser back to the callback URI for this
 * host, because that one is already registered: Keycloak's default ("+"),
 * Authentik and Entra ID all accept a registered redirect URI as the place to
 * return to after logout, so this needs no second registration there. The
 * callback recognises an arrival with no code and forwards it to /signin.
 */
export async function providerLogoutUrl(
  settings: OidcSettings,
  request: Request
) {
  if (!settings.providerLogout) {
    return null;
  }

  try {
    const config = await getConfiguration(settings);

    if (!config.serverMetadata().end_session_endpoint) {
      return null;
    }

    const idToken = await idTokenCookie.parse(request.headers.get("Cookie"));

    return client.buildEndSessionUrl(config, {
      post_logout_redirect_uri: redirectUriFor(settings, request).href,
      ...(typeof idToken === "string" && idToken
        ? { id_token_hint: idToken }
        : {}),
    }).href;
  } catch (error) {
    console.error("[oidc] provider logout unavailable", error);

    return null;
  }
}

/**
 * Discovery is fetched on first use rather than at boot, so an identity
 * provider that is down while Aurora starts degrades the SSO button and not
 * the whole instance. A failed fetch is not cached: the next click retries.
 */
let configuration: Promise<client.Configuration> | undefined;

function getConfiguration(settings: OidcSettings) {
  configuration ??= client
    .discovery(
      settings.issuer,
      settings.clientId,
      undefined,
      clientAuthentication(settings),
      settings.issuer.protocol === "http:"
        ? { execute: [client.allowInsecureRequests] }
        : undefined
    )
    .catch((error: unknown) => {
      configuration = undefined;
      throw error;
    });

  return configuration;
}

function clientAuthentication(settings: OidcSettings) {
  if (!settings.clientSecret) {
    return client.None();
  }

  return settings.clientAuthMethod === "client_secret_post"
    ? client.ClientSecretPost(settings.clientSecret)
    : client.ClientSecretBasic(settings.clientSecret);
}

/**
 * The configured redirect URI on the host the browser is on, so the provider
 * sends it back to the origin that holds its flow cookie — and the session it
 * signs into lands on the domain the user was using. Falls back to the first
 * one for a host that is not listed, such as a health check on an internal
 * address.
 *
 * The forwarded host is believed here although nothing else in Aurora believes
 * it, because it can only ever choose among URIs the operator registered: a
 * spoofed value sends the spoofer's own flow to another of this instance's
 * domains, where it has no cookie and fails.
 */
export function redirectUriFor(settings: OidcSettings, request: Request) {
  const hosts = [
    request.headers.get("x-forwarded-host")?.split(",")[0],
    request.headers.get("host"),
    new URL(request.url).host,
  ]
    .filter((host): host is string => !!host)
    .map((host) => host.trim().toLowerCase().replace(/:\d+$/, ""));

  // In the order the hosts are believed, not the order the URIs are listed:
  // behind a proxy that keeps Host, both name a registered domain and only the
  // forwarded one is where the browser actually is.
  for (const host of hosts) {
    const match = settings.redirectUris.find((uri) => uri.hostname === host);

    if (match) {
      return match;
    }
  }

  return settings.redirectUris[0];
}

/** Builds the redirect to the provider and plants the flow cookie. */
export async function beginOidcFlow(
  settings: OidcSettings,
  request: Request,
  options: { intent: OidcIntent; redirectTo: string; userId: string | null }
) {
  const config = await getConfiguration(settings);
  const redirectUri = redirectUriFor(settings, request);

  const flow: Flow = {
    ...options,
    redirectUri: redirectUri.href,
    state: client.randomState(),
    nonce: client.randomNonce(),
    verifier: client.randomPKCECodeVerifier(),
  };

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri.href,
    scope: settings.scope,
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: await client.calculatePKCECodeChallenge(flow.verifier),
    code_challenge_method: "S256",
  });

  return redirect(url.href, {
    headers: { "Set-Cookie": await flowCookie.serialize(flow) },
  });
}

/** The parts of a provider's answer an Aurora account is built from. */
export type OidcProfile = {
  issuer: string;
  subject: string;
  /** Lowercased and trimmed, like every address /signup stores. */
  email: string | null;
  /** `null` when the provider does not say — Entra ID, for one, never does. */
  emailVerified: boolean | null;
  firstname: string;
  lastname: string;
};

export type OidcFailure =
  /** No flow cookie: it expired, was never set, or the browser dropped it. */
  | "expired"
  /** The provider answered with an error, most often the user declining. */
  | "denied"
  /** Anything else: a state mismatch, a refused code, an unreachable provider. */
  | "failed";

export class OidcError extends Error {
  constructor(
    readonly failure: OidcFailure,
    options?: { cause?: unknown }
  ) {
    super(`OIDC sign-in ${failure}`, options);
    this.name = "OidcError";
  }
}

/** Reads the flow cookie without validating anything else, or null. */
export async function readFlow(request: Request): Promise<Flow | null> {
  const parsed = flowSchema.safeParse(
    await flowCookie.parse(request.headers.get("Cookie"))
  );

  return parsed.success ? parsed.data : null;
}

/**
 * Validates the provider's redirect against the flow it belongs to, redeems the
 * code and returns the profile, plus the raw ID token for a later logout hint.
 * Throws `OidcError` and nothing else.
 */
export async function completeOidcFlow(
  settings: OidcSettings,
  request: Request,
  flow: Flow
): Promise<{ profile: OidcProfile; idToken: string | undefined }> {
  // The URL the provider redirected to, rebuilt from the redirect URI the flow
  // was sent through rather than taken from the request. openid-client sends
  // it back to the token endpoint as `redirect_uri`, which must match the one
  // in the authorization request byte for byte, and behind a TLS-terminating
  // proxy `request.url` says http:// and an internal host. Checked against the
  // configuration again in case it changed while the user was away.
  const registered = settings.redirectUris.find(
    (uri) => uri.href === flow.redirectUri
  );

  if (!registered) {
    throw new OidcError("failed");
  }

  const callbackUrl = new URL(registered);
  callbackUrl.search = new URL(request.url).search;

  try {
    const config = await getConfiguration(settings);

    const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: flow.verifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true,
    });

    // `idTokenExpected` makes this non-optional in practice; the library's
    // type cannot know that.
    const claims = tokens.claims()!;

    // Providers differ on what goes into the ID token. Keycloak, Authentik and
    // Google put the email there; others keep everything but `sub` behind the
    // userinfo endpoint, which is asked only when the token came up short.
    // `fetchUserInfo` checks its `sub` against the token's, so the answer
    // cannot describe somebody else.
    const userinfo =
      typeof claims.email !== "string" &&
      config.serverMetadata().userinfo_endpoint
        ? await client.fetchUserInfo(config, tokens.access_token, claims.sub)
        : undefined;

    return { profile: toProfile(claims, userinfo), idToken: tokens.id_token };
  } catch (error) {
    if (error instanceof client.AuthorizationResponseError) {
      throw new OidcError("denied", { cause: error });
    }

    throw new OidcError("failed", { cause: error });
  }
}

const emailSchema = z.email();

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Cognito, among others, has sent `email_verified` as the string "true". Read
 * both spellings; anything else is "the provider did not say".
 */
function asBoolean(value: unknown) {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return null;
}

/**
 * Exported for tests. `claims` is the verified ID token; `userinfo`, when the
 * token lacked an email, fills the gaps — the email and its verification flag
 * are always taken from the same source, never one from each.
 */
export function toProfile(
  claims: client.IDToken,
  userinfo?: client.UserInfoResponse
): OidcProfile {
  const source: Record<string, unknown> =
    typeof claims.email === "string" ? claims : (userinfo ?? {});
  const pick = (key: string) =>
    asString((claims as Record<string, unknown>)[key]) ??
    asString((userinfo as Record<string, unknown> | undefined)?.[key]);

  const email = asString(source.email)?.toLowerCase() ?? null;
  const validEmail =
    email && emailSchema.safeParse(email).success ? email : null;

  // Most providers fill given_name and family_name. Those that only send a
  // display name get it split at the last space, and those that send neither
  // get the mailbox name, so the account page has something to show and the
  // user something to correct.
  let firstname = pick("given_name");
  let lastname = pick("family_name");

  if (!firstname && !lastname) {
    const name = pick("name");
    const split = name?.lastIndexOf(" ") ?? -1;

    if (name && split > 0) {
      firstname = name.slice(0, split).trim();
      lastname = name.slice(split + 1).trim();
    } else {
      firstname =
        name ?? pick("preferred_username") ?? validEmail?.split("@")[0];
    }
  }

  return {
    issuer: claims.iss,
    subject: claims.sub,
    email: validEmail,
    emailVerified: validEmail ? asBoolean(source.email_verified) : null,
    firstname: firstname ?? "",
    lastname: lastname ?? "",
  };
}
