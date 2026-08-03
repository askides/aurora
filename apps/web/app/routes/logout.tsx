import { redirect } from "react-router";
import { logout } from "~/lib/session.server";
import type { Route } from "./+types/logout";

/** POST-only, so a stray <img> or link can't sign the user out (CSRF). */
export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

export async function loader() {
  return redirect("/");
}
