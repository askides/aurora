import { Outlet } from "react-router";
import { AppShell } from "~/components/shell";
import { getUserWebsites } from "~/lib/queries.server";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/app";

/**
 * Auth gate for the whole authenticated area. Replaces the client-side
 * <AuthenticatedRoute> wrapper — unauthenticated requests never reach the
 * child loaders, and no user data is sent to the browser before the check.
 *
 * The website list is loaded here because the shell's switcher and breadcrumb
 * need it on every screen; child routes would each have to refetch it.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const websites = await getUserWebsites(user.id);

  return { user, websites };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { user, websites } = loaderData;

  return (
    <AppShell user={user} websites={websites}>
      <Outlet />
    </AppShell>
  );
}
