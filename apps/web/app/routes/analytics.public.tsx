import { ArrowUpRightIcon } from "lucide-react";
import { AnalyticsDashboard } from "~/modules/analytics/components/dashboard";
import {
  Page,
  PageDescription,
  PageHeader,
  PageHeading,
  PageTitle,
} from "~/shared/components/page-header";
import { PublicShell } from "~/shell/app-shell";
import { loadDashboard } from "~/modules/analytics/loader.server";
import { requireWebsiteAccess } from "~/modules/auth/website-access.server";
import type { Route } from "./+types/analytics.public";

export const meta = () => [{ title: "Dashboard — Aurora" }];

/**
 * Public read-only dashboard. requireWebsiteAccess allows anonymous access only
 * when the website is flagged public, so the route needs no isPublic prop
 * threading — the check happens before anything renders.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const website = await requireWebsiteAccess(request, params.id);

  return {
    ...(await loadDashboard(params.id, new URL(request.url))),
    // Only the two fields the header shows are serialised: the rest of the row
    // (owner id, flags, timestamps) has no business reaching an anonymous
    // viewer just because the site is shared.
    website: { name: website.name, url: website.url },
  };
}

/** Same reason as the owner dashboard: the URL column is a free string. */
function siteHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function PublicAnalytics({ loaderData }: Route.ComponentProps) {
  const { website } = loaderData;

  return (
    <PublicShell>
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
        </PageHeader>

        <AnalyticsDashboard data={loaderData} />
      </Page>
    </PublicShell>
  );
}
