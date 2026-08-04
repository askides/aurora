import { ArrowUpRightIcon, CopyIcon, Settings2Icon } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { AnalyticsDashboard } from "~/components/analytics-dashboard";
import {
  Page,
  PageActions,
  PageDescription,
  PageHeader,
  PageHeading,
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
  const website = await requireWebsiteOwner(user.id, params.id);

  // The ownership check already loaded the row, so naming the site in the
  // header costs nothing extra.
  return { ...(await loadDashboard(params.id, new URL(request.url))), website };
}

/**
 * The URL column is a free string (see websiteSchema), so a site stored as
 * "example.com" would otherwise resolve against the dashboard's own origin.
 */
function siteHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function Analytics({ loaderData }: Route.ComponentProps) {
  const { website } = loaderData;

  async function copyPublicLink() {
    // Read off window inside the handler: the origin is unknowable during SSR,
    // and this only ever runs after a click.
    const link = `${window.location.origin}/websites/${website.id}/s/analytics`;

    try {
      await navigator.clipboard.writeText(link);

      toast.success("Public link copied");
    } catch {
      // Clipboard writes are refused outside secure contexts, which self-hosted
      // installs served over plain HTTP hit routinely.
      toast.error("Clipboard blocked. Copy the link from Settings instead.");
    }
  }

  return (
    <Page>
      <PageHeader>
        <PageHeading>
          <PageTitle>{website.name}</PageTitle>
          <PageDescription>
            <a
              href={siteHref(website.url)}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 hover:underline"
            >
              {website.url}
              <ArrowUpRightIcon className="size-3" />
            </a>
          </PageDescription>
        </PageHeading>

        <PageActions>
          <Button
            variant="outline"
            render={<Link to={`/websites/${website.id}/edit`} />}
          >
            <Settings2Icon />
            Settings
          </Button>

          {website.is_public && (
            <Button variant="outline" onClick={copyPublicLink}>
              <CopyIcon />
              Copy public link
            </Button>
          )}
        </PageActions>
      </PageHeader>

      <AnalyticsDashboard data={loaderData} />
    </Page>
  );
}
