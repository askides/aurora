import { Link, redirect, useNavigation } from "react-router";
import {
  Page,
  PageActions,
  PageHeader,
  PageTitle,
} from "~/components/page-header";
import { WebsiteForm } from "~/components/website-form";
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
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Form } from "react-router";
import { deleteWebsite, updateWebsite } from "~/lib/queries.server";
import { requireUser } from "~/lib/session.server";
import { websiteSchema } from "~/lib/validation";
import { requireWebsiteOwner } from "~/lib/website-access.server";
import type { Route } from "./+types/websites.edit";

export const meta = () => [{ title: "Website Details — Aurora" }];

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

  return (
    <Page>
      <PageHeader>
        <PageTitle>Website Details</PageTitle>
        <PageActions>
          <Button variant="outline" render={<Link to="/" />}>
            Back to Websites
          </Button>

          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Delete Website
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Website</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure? You can&apos;t undo this action afterwards.
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
                    Delete
                  </AlertDialogAction>
                </Form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </PageActions>
      </PageHeader>

      {actionData && "ok" in actionData && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Website updated.
        </p>
      )}

      <WebsiteForm
        values={website}
        error={
          actionData && "error" in actionData ? actionData.error : undefined
        }
        shareLink={shareLink}
        snippet={snippet}
      />
    </Page>
  );
}
