import { redirect } from "react-router";
import { authConfig } from "~/modules/auth/config.server";
import {
  clearIdTokenCookie,
  providerLogoutUrl,
} from "~/modules/auth/oidc.server";
import { getSignInMethod, signout } from "~/modules/auth/session.server";
import type { Route } from "./+types/signout";

/**
 * POST-only, so a stray <img> or link can't sign the user out (CSRF).
 *
 * A session SSO started is ended at the provider too (RP-initiated logout),
 * which then sends the browser back to /signin by way of the callback. One a
 * password started ends here, as it always has: sending a password user
 * through the provider would sign them out of a session they never used for
 * Aurora.
 */
export async function action({ request }: Route.ActionArgs) {
  const settings = authConfig.oidc;
  const method = await getSignInMethod(request);

  const to =
    settings && method === "sso"
      ? await providerLogoutUrl(settings, request)
      : null;

  const response = await signout(request, to ?? "/signin");
  response.headers.append("Set-Cookie", await clearIdTokenCookie());

  return response;
}

export async function loader() {
  return redirect("/");
}
