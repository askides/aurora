import { corsJson, preflight } from "~/lib/cors.server";
import { prisma, getWebsite } from "~/lib/queries.server";
import { z } from "zod";
import type { Route } from "./+types/collect.$id";

/** Body of the navigator.sendBeacon call that reports visit duration. */
export const durationSchema = z.object({
  wid: z.string().min(1),
  duration: z.number(),
});

export async function loader({ request }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return preflight();
  }

  return corsJson({ message: "Method not allowed" }, 405);
}

/**
 * Visit duration, delivered by navigator.sendBeacon on visibilitychange.
 * sendBeacon posts a plain string, so the body is read as text and parsed here
 * rather than relying on a JSON content type.
 */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return preflight();
  }

  if (request.method !== "POST") {
    return corsJson({ message: "Method not allowed" }, 405);
  }

  let body: unknown;

  try {
    body = JSON.parse(await request.text());
  } catch {
    return corsJson({ message: "Invalid payload" }, 422);
  }

  const parsed = durationSchema.safeParse(body);

  if (!parsed.success) {
    return corsJson({ message: parsed.error.issues[0].message }, 422);
  }

  const website = await getWebsite(parsed.data.wid);

  if (!website) {
    return corsJson({ message: "Not found" }, 404);
  }

  // Scoped to the website so an event id alone can't be used to write anywhere.
  const { count } = await prisma.event.updateMany({
    where: { id: params.id, website_id: website.id },
    data: { duration: parsed.data.duration },
  });

  if (count === 0) {
    return corsJson({ message: "Not found" }, 404);
  }

  return corsJson({ ok: true });
}
