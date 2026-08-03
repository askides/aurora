import { AnalyticsDashboard } from "~/components/analytics-dashboard";
import { Page, PageHeader, PageTitle } from "~/components/page-header";
import { Shell } from "~/components/shell";
import { loadDashboard } from "~/lib/analytics.server";
import { requireWebsiteAccess } from "~/lib/website-access.server";
import type { Route } from "./+types/analytics.public";

export const meta = () => [{ title: "Dashboard — Aurora" }];

/**
 * Public read-only dashboard. requireWebsiteAccess allows anonymous access only
 * when the website is flagged public, so the route needs no isPublic prop
 * threading — the check happens before anything renders.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  await requireWebsiteAccess(request, params.id);

  return loadDashboard(params.id, new URL(request.url));
}

export default function PublicAnalytics({ loaderData }: Route.ComponentProps) {
  return (
    <Shell isPublic>
      <Page>
        <PageHeader>
          <PageTitle>Dashboard</PageTitle>
        </PageHeader>

        <AnalyticsDashboard data={loaderData} />
      </Page>
    </Shell>
  );
}
