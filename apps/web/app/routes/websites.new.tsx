import { Link, redirect } from "react-router";
import {
  Page,
  PageActions,
  PageHeader,
  PageTitle,
} from "~/components/page-header";
import { WebsiteForm, websiteSchema } from "~/components/website-form";
import { Button } from "~/components/ui/button";
import { createWebsite } from "~/lib/queries.server";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/websites.new";

export const meta = () => [{ title: "Create Website — Aurora" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();

  const parsed = websiteSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    is_public: formData.get("is_public") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await createWebsite({ ...parsed.data, user_id: user.id });

  return redirect("/");
}

export default function NewWebsite({ actionData }: Route.ComponentProps) {
  return (
    <Page>
      <PageHeader>
        <PageTitle>Create Website</PageTitle>
        <PageActions>
          <Button variant="outline" render={<Link to="/" />}>
            Back to Websites
          </Button>
        </PageActions>
      </PageHeader>

      <WebsiteForm isNew error={actionData?.error} />
    </Page>
  );
}
