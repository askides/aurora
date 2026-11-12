import { redirect } from "react-router";
import { authConfig } from "~/modules/auth/config.server";
import { beginOidcFlow } from "~/modules/auth/oidc.server";
import {
  redirectWithError,
  requireUser,
  safeRedirect,
} from "~/modules/auth/session.server";
import { ssoFailureMessage } from "~/modules/auth/sso.server";
import type { Route } from "./+types/auth.oidc";

/**
 * Starts an SSO round trip: `intent=signin` from the sign-in and signup pages,
 * `intent=link` from the account page.
 *
 * POST-only, like /signout. A link that started a connection would let any page
 * the user visits send them through the provider and back on its own say-so;
 * the session cookie is `SameSite=Lax`, so a cross-site POST arrives without
 * it and `link` fails at `requireUser` below.
 */
export async function action({ request }: Route.ActionArgs) {
  const settings = authConfig.oidc;

  if (!settings) {
    throw new Response("Not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") === "link" ? "link" : "signin";
  const userId = intent === "link" ? (await requireUser(request)).id : null;

  try {
    return await beginOidcFlow(settings, request, {
      intent,
      userId,
      redirectTo:
        intent === "link"
          ? "/account"
          : safeRedirect(formData.get("redirectTo")),
    });
  } catch (error) {
    console.error("[oidc] discovery failed", error);

    return redirectWithError(
      request,
      intent === "link" ? "/account" : "/signin",
      ssoFailureMessage("unreachable", settings.providerName)
    );
  }
}

export async function loader() {
  return redirect("/signin");
}
