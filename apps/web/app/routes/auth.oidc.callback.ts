import { redirect } from "react-router";
import { authConfig } from "~/modules/auth/config.server";
import {
  OidcError,
  clearFlowCookie,
  completeOidcFlow,
  readFlow,
  rememberIdToken,
} from "~/modules/auth/oidc.server";
import {
  throttleSignIn,
  tooManyAttemptsMessage,
} from "~/modules/auth/ratelimit.server";
import {
  createUserSession,
  getCurrentUser,
  redirectWithError,
  safeRedirect,
} from "~/modules/auth/session.server";
import {
  connectIdentity,
  signInWithIdentity,
  ssoFailureMessage,
  type SsoFailure,
} from "~/modules/auth/sso.server";
import type { Route } from "./+types/auth.oidc.callback";

/**
 * Where the identity provider sends the browser back to. Every way out of here
 * clears the flow cookie: its state and nonce are single-use, and leaving them
 * behind would only let a replayed callback get further before failing.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const settings = authConfig.oidc;

  if (!settings) {
    throw new Response("Not found", { status: 404 });
  }

  // The provider's way back after a logout: the same URI, with no code and no
  // error, because Aurora asked to be returned here (see providerLogoutUrl).
  const params = new URL(request.url).searchParams;

  if (!params.has("code") && !params.has("error")) {
    return redirect("/signin", {
      headers: { "Set-Cookie": await clearFlowCookie() },
    });
  }

  const flow = await readFlow(request);
  const user = await getCurrentUser(request);

  const fail = async (to: string, failure: SsoFailure) => {
    const response = await redirectWithError(
      request,
      to,
      ssoFailureMessage(failure, settings.providerName)
    );
    response.headers.append("Set-Cookie", await clearFlowCookie());

    return response;
  };

  // Each callback is a token request to the provider, so it is throttled
  // before anything here makes one.
  const wait = throttleSignIn(request);

  if (wait !== null) {
    const response = await redirectWithError(
      request,
      user ? "/account" : "/signin",
      tooManyAttemptsMessage(wait)
    );
    response.headers.append("Set-Cookie", await clearFlowCookie());

    return response;
  }

  if (!flow) {
    return fail(user ? "/account" : "/signin", "expired");
  }

  // A connection is for the account that asked for it. Signing out, or into
  // another account, while the provider's page was open ends it here rather
  // than attaching the identity to whoever holds the session now.
  if (flow.intent === "link" && user?.id !== flow.userId) {
    return fail(user ? "/account" : "/signin", "expired");
  }

  let profile;
  let idToken;

  try {
    ({ profile, idToken } = await completeOidcFlow(settings, request, flow));
  } catch (error) {
    if (!(error instanceof OidcError)) {
      throw error;
    }

    console.error("[oidc] callback rejected", error.cause ?? error);

    return fail(flow.intent === "link" ? "/account" : "/signin", error.failure);
  }

  if (flow.intent === "link") {
    const outcome = await connectIdentity(settings, flow.userId!, profile);

    if (!outcome.ok) {
      return fail("/account", outcome.failure);
    }

    return redirect("/account", {
      headers: { "Set-Cookie": await clearFlowCookie() },
    });
  }

  const outcome = await signInWithIdentity(settings, profile);

  if (!outcome.ok) {
    return fail("/signin", outcome.failure);
  }

  const response = await createUserSession(
    outcome.userId,
    safeRedirect(flow.redirectTo),
    "sso"
  );
  response.headers.append("Set-Cookie", await clearFlowCookie());

  const remembered = await rememberIdToken(idToken);

  if (remembered) {
    response.headers.append("Set-Cookie", remembered);
  }

  return response;
}
