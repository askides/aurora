import { events } from "~/db/schema";
import { corsJson, preflight } from "~/lib/cors.server";
import { db, getWebsite } from "~/lib/queries.server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Route } from "./+types/collect.$id";

/** One day in milliseconds — matches the events_duration_range check. */
const MAX_DURATION = 86_400_000;

/**
 * Body of the navigator.sendBeacon call that reports visit duration.
 * /collect is unauthenticated and the event id is handed back in the 201, so
 * the bounds matter: without them anyone could post a negative or absurd
 * duration and permanently skew a site's average.
 */
export const durationSchema = z.object({
  wid: z.string().min(1),
  duration: z.number().min(0).max(MAX_DURATION),
});

export async function loader({ request }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return preflight();
  }

  return corsJson({ message: "Method not allowed" }, 405);
}

/**
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
  const updated = await db
    .update(events)
    .set({ duration: parsed.data.duration })
    .where(and(eq(events.id, params.id), eq(events.website_id, website.id)))
    .returning({ id: events.id });

  if (updated.length === 0) {
    return corsJson({ message: "Not found" }, 404);
  }

  return corsJson({ ok: true });
}
