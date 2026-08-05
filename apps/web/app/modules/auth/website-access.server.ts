import { getCurrentUser } from "./session.server";
import { getWebsite } from "~/modules/websites/queries.server";

/**
 * Metric data is readable by the owner, or by anyone when the website is marked
 * public. Mirrors the check the metric controllers each repeated inline.
 */
export async function requireWebsiteAccess(request: Request, wid: string) {
  const website = await getWebsite(wid);

  if (!website) {
    throw new Response("Not found", { status: 404 });
  }

  if (website.is_public) {
    return website;
  }

  const user = await getCurrentUser(request);

  if (!user) {
    throw new Response("Unauthenticated", { status: 401 });
  }

  if (user.id !== website.user_id) {
    throw new Response("Unauthorized", { status: 403 });
  }

  return website;
}

/** Owner-only access, used by the edit/update/delete paths. */
export async function requireWebsiteOwner(userId: string, wid: string) {
  const website = await getWebsite(wid);

  if (!website) {
    throw new Response("Not found", { status: 404 });
  }

  if (website.user_id !== userId) {
    throw new Response("Unauthorized", { status: 403 });
  }

  return website;
}
