import { redirect } from "react-router";
import { websiteSchema } from "~/modules/websites/components/website-form";
import { createWebsite } from "~/modules/websites/queries.server";
import { requireUser } from "~/modules/auth/session.server";
import type { Route } from "./+types/websites.new";

/**
 * Action-only route: adding a site is three fields and now happens in the
 * <AddWebsiteSheet> panel, which posts here with a fetcher. There is no page
 * left to render, so a direct visit goes back to the list.
 */
export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  return redirect("/");
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
