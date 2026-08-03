import { Link } from "react-router";
import { AnalyticsDashboard } from "~/components/analytics-dashboard";
import {
  Page,
  PageActions,
  PageHeader,
  PageTitle,
} from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { loadDashboard } from "~/lib/analytics.server";
import { requireUser } from "~/lib/session.server";
import { requireWebsiteOwner } from "~/lib/website-access.server";
import type { Route } from "./+types/analytics";

export const meta = () => [{ title: "Dashboard — Aurora" }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  await requireWebsiteOwner(user.id, params.id);

  return loadDashboard(params.id, new URL(request.url));
}

export default function Analytics({ loaderData }: Route.ComponentProps) {
  return (
    <Page>
      <PageHeader>
        <PageTitle>Dashboard</PageTitle>
        <PageActions>
          <Button variant="outline" render={<Link to="/" />}>
            Back to Websites
          </Button>
        </PageActions>
      </PageHeader>

      <AnalyticsDashboard data={loaderData} />
    </Page>
  );
}
