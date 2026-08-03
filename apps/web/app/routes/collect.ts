import { eventMetadata, events, metadata as metadataTable } from "~/db/schema";
import { corsJson, preflight } from "~/lib/cors.server";
import { db, getWebsite } from "~/lib/queries.server";
import { parse } from "~/lib/ua.server";
import { and, eq, sql } from "drizzle-orm";
import localeCodes from "locale-codes";
import { z } from "zod";
import type { Route } from "./+types/collect";

/** The payload packages/tracker/src/aurora.js POSTs on every pageview. */
export const collectSchema = z.object({
  // The only type the tracker emits. Anything else would be counted in the
  // totals but invisible in the Pages breakdown, so reject it outright.
  type: z.literal("pageView").default("pageView"),
  element: z.string().min(1).max(2048),
  wid: z.string().min(1),
  language: z.string().max(64).optional(),
  referrer: z.string().max(2048).optional(),

  uid: z.string().optional(),
  lastPageViewID: z.string().nullish(),
  isNewVisitor: z.boolean().optional(),
  isNewSession: z.boolean().optional(),
  lastVisitAt: z.number().optional(),
  expires: z.number().optional(),
});

export async function loader({ request }: Route.LoaderArgs) {
  if (request.method === "OPTIONS") {
    return preflight();
  }

  return corsJson({ message: "Method not allowed" }, 405);
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return preflight();
  }

  if (request.method !== "POST") {
    return corsJson({ message: "Method not allowed" }, 405);
  }

  const parsed = collectSchema.safeParse(await request.json());

  if (!parsed.success) {
    return corsJson({ message: parsed.error.issues[0].message }, 422);
  }

  const payload = parsed.data;
  const website = await getWebsite(payload.wid);

  if (!website) {
    return corsJson({ message: "Not found" }, 404);
  }

  const ua = parse(request.headers.get("user-agent"));
  const elements = ua.elements.map((element) => ({
    type: element.type,
    value: element.value,
    // The unique key spans version, and NULLs would not dedupe.
    version: element.version ?? "",
  }));

  if (payload.referrer && payload.referrer !== "") {
    elements.push({ type: "referrer", value: payload.referrer, version: "" });
  }

  const locale = payload.language
    ? localeCodes.getByTag(payload.language)
    : null;

  if (locale) {
    elements.push({ type: "locale", value: locale.tag, version: "" });
  }

  const isBounce = !payload.lastPageViewID || Boolean(payload.isNewSession);

  const { event, dimensions } = await db.transaction(async (tx) => {
    // One round-trip for every dimension, relying on the unique key rather
    // than a read-then-write that races with concurrent first-hits.
    const upserted = elements.length
      ? await tx
          .insert(metadataTable)
          .values(elements)
          .onConflictDoUpdate({
            target: [
              metadataTable.type,
              metadataTable.value,
              metadataTable.version,
            ],
            // A no-op write, so the row is returned whether or not it existed.
            set: { type: sql`excluded.type` },
          })
          .returning()
      : [];

    // A second view in the same session retroactively clears the previous
    // bounce. Scoped to this website so an event id alone can't flip a flag
    // on another tenant's row.
    if (!isBounce && payload.lastPageViewID) {
      await tx
        .update(events)
        .set({ is_a_bounce: false })
        .where(
          and(
            eq(events.id, payload.lastPageViewID),
            eq(events.website_id, website.id)
          )
        );
    }

    const [created] = await tx
      .insert(events)
      .values({
        type: payload.type,
        element: payload.element,
        website_id: website.id,
        is_new_visitor: Boolean(payload.isNewVisitor),
        is_new_session: Boolean(payload.isNewSession),
        is_a_bounce: isBounce,
      })
      .returning();

    if (upserted.length) {
      await tx.insert(eventMetadata).values(
        upserted.map((dimension) => ({
          event_id: created.id,
          metadata_id: dimension.id,
        }))
      );
    }

    return { event: created, dimensions: upserted };
  });

  return corsJson({ ...event, metadata: dimensions }, 201);
}
