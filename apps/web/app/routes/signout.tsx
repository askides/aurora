import { redirect } from "react-router";
import { signout } from "~/modules/auth/session.server";
import type { Route } from "./+types/signout";

/** POST-only, so a stray <img> or link can't sign the user out (CSRF). */
export async function action({ request }: Route.ActionArgs) {
  return signout(request);
}

export async function loader() {
  return redirect("/");
}
