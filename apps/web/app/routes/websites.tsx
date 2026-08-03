import { Link } from "react-router";
import {
  Page,
  PageActions,
  PageHeader,
  PageTitle,
} from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getUserWebsites } from "~/lib/queries.server";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/websites";

export const meta = () => [{ title: "Websites — Aurora" }];

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  return { websites: await getUserWebsites(user.id) };
}

export default function Websites({ loaderData }: Route.ComponentProps) {
  const { websites } = loaderData;

  return (
    <Page>
      <PageHeader>
        <PageTitle>Websites</PageTitle>
        <PageActions>
          <Button render={<Link to="/websites/new" />}>Create New</Button>
        </PageActions>
      </PageHeader>

      {websites.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground">
              Here is absolute emptiness..
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Url</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {websites.map((website) => (
                  <TableRow key={website.id}>
                    <TableCell className="font-semibold">
                      {website.name}
                    </TableCell>
                    <TableCell>{website.url}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {website.is_public ? "Public" : "Private"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          render={<Link to={`/websites/${website.id}/edit`} />}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          render={
                            <Link to={`/websites/${website.id}/analytics`} />
                          }
                        >
                          View Analytics
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </Page>
  );
}
