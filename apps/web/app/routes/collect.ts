import { corsJson, preflight } from "~/lib/cors.server";
import { prisma, getWebsite } from "~/lib/queries.server";
import { parse } from "~/lib/ua.server";
import { collectSchema } from "~/lib/validation";
import localeCodes from "locale-codes";
import type { Route } from "./+types/collect";

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
  const elements = [...ua.elements];

  if (payload.referrer && payload.referrer !== "") {
    elements.push({
      type: "referrer",
      value: payload.referrer,
      version: null,
    });
  }

  const locale = payload.language
    ? localeCodes.getByTag(payload.language)
    : null;

  if (locale) {
    elements.push({ type: "locale", value: locale.tag, version: null });
  }

  const metadata = [];

  for (const element of elements) {
    const existing = await prisma.metadata.findFirst({ where: element });

    metadata.push(
      existing ?? (await prisma.metadata.create({ data: element }))
    );
  }

  const isBounce = !payload.lastPageViewID || Boolean(payload.isNewSession);

  // A second view in the same session retroactively clears the previous bounce.
  if (!isBounce && payload.lastPageViewID) {
    await prisma.event.updateMany({
      where: { id: payload.lastPageViewID },
      data: { is_a_bounce: false },
    });
  }

  const event = await prisma.event.create({
    data: {
      type: payload.type,
      element: payload.element,
      website_id: website.id,
      is_new_visitor: Boolean(payload.isNewVisitor),
      is_new_session: Boolean(payload.isNewSession),
      is_a_bounce: isBounce,
      metadata: { connect: metadata.map((meta) => ({ id: meta.id })) },
    },
    include: { metadata: true },
  });

  return corsJson(event, 201);
}
