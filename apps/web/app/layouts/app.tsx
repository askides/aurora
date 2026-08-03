import { Outlet } from "react-router";
import { Shell } from "~/components/shell";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/app";

/**
 * Auth gate for the whole authenticated area. Replaces the client-side
 * <AuthenticatedRoute> wrapper — unauthenticated requests never reach the
 * child loaders, and no user data is sent to the browser before the check.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  return { user };
}

export default function AppLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
