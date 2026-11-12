import { redirect } from "react-router";
import { authConfig } from "~/modules/auth/config.server";
import {
  OidcError,
  clearFlowCookie,
  completeOidcFlow,
  readFlow,
} from "~/modules/auth/oidc.server";
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

  try {
    profile = await completeOidcFlow(settings, request, flow);
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
    safeRedirect(flow.redirectTo)
  );
  response.headers.append("Set-Cookie", await clearFlowCookie());

  return response;
}
