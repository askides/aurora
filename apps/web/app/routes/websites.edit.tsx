import { useEffect } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { ChartLineIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Page,
  PageActions,
  PageDescription,
  PageHeader,
  PageHeading,
  PageTitle,
} from "~/shared/components/page-header";
import {
  WebsiteForm,
  websiteSchema,
} from "~/modules/websites/components/website-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/shared/ui/alert-dialog";
import { Button } from "~/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/ui/card";
import { Spinner } from "~/shared/ui/spinner";
import {
  deleteWebsite,
  updateWebsite,
} from "~/modules/websites/queries.server";
import { requireUser } from "~/modules/auth/session.server";
import { requireWebsiteOwner } from "~/modules/auth/website-access.server";
import type { Route } from "./+types/websites.edit";

export const meta = () => [{ title: "Website settings — Aurora" }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const website = await requireWebsiteOwner(user.id, params.id);

  const origin = new URL(request.url).origin;

  return {
    website,
    shareLink: `${origin}/websites/${website.id}/s/analytics`,
    snippet: `<script async defer src="${origin}/tracker.js" aurora-id="${website.id}"></script>`,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  await requireWebsiteOwner(user.id, params.id);

  const formData = await request.formData();

  // Ownership is re-checked above, so delete can no longer remove another
  // user's website the way the old DELETE /websites/:id endpoint allowed.
  if (formData.get("intent") === "delete") {
    await deleteWebsite(params.id);

    return redirect("/");
  }

  const parsed = websiteSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    is_public: formData.get("is_public") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await updateWebsite(params.id, parsed.data);

  return { ok: true };
}

export default function EditWebsite({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { website, shareLink, snippet } = loaderData;
  const navigation = useNavigation();
  const isDeleting = navigation.formData?.get("intent") === "delete";

  useEffect(() => {
    if (actionData && "ok" in actionData) {
      toast.success("Changes saved");
    }
  }, [actionData]);

  return (
    <Page>
      <PageHeader>
        <PageHeading>
          <PageTitle>{website.name}</PageTitle>
          <PageDescription>{website.url}</PageDescription>
        </PageHeading>
        <PageActions>
          <Button
            variant="outline"
            render={<Link to={`/websites/${website.id}/analytics`} />}
          >
            <ChartLineIcon />
            View analytics
          </Button>
        </PageActions>
      </PageHeader>

      <WebsiteForm
        values={website}
        error={
          actionData && "error" in actionData ? actionData.error : undefined
        }
        shareLink={shareLink}
        snippet={snippet}
      />

      {/* Card's default ring is swapped for a destructive border, not stacked with it. */}
      <Card className="border border-destructive/40 ring-0">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Deleting {website.name} removes every pageview recorded for it. This
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Delete website
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete website</AlertDialogTitle>
                <AlertDialogDescription>
                  {website.name} and every pageview recorded for it will be
                  deleted permanently.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <AlertDialogAction
                    type="submit"
                    variant="destructive"
                    disabled={isDeleting}
                  >
                    {isDeleting && <Spinner />}
                    Delete
                  </AlertDialogAction>
                </Form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </Page>
  );
}
