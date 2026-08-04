import { Globe, Lock, MoreHorizontal, Plus } from "lucide-react";
import { Link } from "react-router";
import { AddWebsiteSheet } from "~/components/add-website-sheet";
import { DAILY_VISITORS_HINT, MetricHint } from "~/components/metric-hint";
import {
  Page,
  PageActions,
  PageDescription,
  PageHeader,
  PageHeading,
  PageTitle,
} from "~/components/page-header";
import { Sparkline } from "~/components/sparkline";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatCompactNumber, formatNumber, initials } from "~/lib/format";
import { getUserWebsitesOverview, OVERVIEW_DAYS } from "~/lib/queries.server";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/websites";

export const meta = () => [{ title: "Websites — Aurora" }];

const RECEIVING_WINDOW = 24 * 60 * 60 * 1000;

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const sites = await getUserWebsitesOverview(user.id);
  const now = Date.now();

  return {
    days: OVERVIEW_DAYS,
    websites: sites.map((site) => ({
      id: site.id,
      name: site.name,
      url: site.url,
      is_public: site.is_public,
      views: site.views,
      visitors: site.visitors,
      spark: site.spark,
      // Deciding this against the clock during render would make the server
      // markup and the hydrated markup disagree, so it is resolved once here.
      receiving:
        site.lastEventAt !== null &&
        now - site.lastEventAt.getTime() < RECEIVING_WINDOW,
    })),
  };
}

export default function Websites({ loaderData }: Route.ComponentProps) {
  const { days, websites } = loaderData;

  return (
    <Page>
      <PageHeader>
        <PageHeading>
          <PageTitle>Websites</PageTitle>
          <PageDescription>
            {/* "every site on this instance" was a claim about the database
                and the loader makes one about the session: the overview is
                `getUserWebsitesOverview(user.id)`, restricted to
                `websites.user_id`. A stock install has one user, so the two
                populations coincide today and the sentence would start
                under-reporting silently the moment a second one exists. */}
            Traffic across your sites, last {days} days.
          </PageDescription>
        </PageHeading>
        <PageActions>
          <AddWebsiteSheet
            trigger={
              <Button>
                <Plus />
                Add website
              </Button>
            }
          />
        </PageActions>
      </PageHeader>

      {websites.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Globe />
            </EmptyMedia>
            <EmptyTitle>No websites yet</EmptyTitle>
            <EmptyDescription>
              Add a website to start collecting pageviews. Aurora sets no
              cookies and needs no consent banner.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AddWebsiteSheet
              trigger={
                <Button>
                  <Plus />
                  Add website
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader sticky>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>{days} days</TableHead>
                <TableHead numeric>Pageviews</TableHead>
                {/* Same figure and same caveat as the dashboard tile: the id
                    behind it rotates at midnight, so a week of it is seven
                    daily counts added up. */}
                <TableHead numeric>
                  <span className="inline-flex items-center gap-1">
                    Daily visitors
                    <MetricHint about="Daily visitors">
                      {DAILY_VISITORS_HINT}
                    </MetricHint>
                  </span>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {websites.map((website) => (
                <TableRow key={website.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* Stands in for a site logo — Aurora will not fetch a
                            favicon from a third party to get one. */}
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-xs font-semibold text-muted-foreground"
                      >
                        {initials(website.name, 1)}
                      </span>

                      <div className="min-w-0">
                        <Link
                          to={`/websites/${website.id}/analytics`}
                          className="block truncate font-medium hover:underline"
                        >
                          {website.name}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">
                          {website.url}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {/* A flat line and a row of zeros reads as "nothing yet"
                          only if you already know the site is live; say it. */}
                    {website.receiving || website.views > 0 ? (
                      <Sparkline
                        data={website.spark}
                        className="h-7 w-20 text-primary"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Waiting for data
                      </span>
                    )}
                  </TableCell>
                  <TableCell numeric title={formatNumber(website.views)}>
                    {formatCompactNumber(website.views)}
                  </TableCell>
                  <TableCell numeric title={formatNumber(website.visitors)}>
                    {formatCompactNumber(website.visitors)}
                  </TableCell>
                  <TableCell>
                    {website.is_public ? (
                      <Badge variant="outline">
                        <Globe />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Lock />
                        Private
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Website actions"
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          render={
                            <Link to={`/websites/${website.id}/analytics`} />
                          }
                        >
                          View analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          render={<Link to={`/websites/${website.id}/edit`} />}
                        >
                          Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Page>
  );
}
