import * as AuroraDB from "../database";
import { NotFoundError, ValidationError } from "../error";
import { tag } from "../utils/tag";
import { parse } from "../utils/ua";

export const CollectController = {
  store: async ({ req, res }) => {
    const rules = Joi.object({
      type: Joi.string(),
      element: Joi.string().required(),
      wid: Joi.string().required(),
      language: Joi.string(),
      referrer: Joi.string().allow(""),

      // Currently not used
      uid: Joi.string(),
      lastPageViewID: Joi.string().allow(null),
      isNewVisitor: Joi.boolean(),
      isNewSession: Joi.boolean(),
      lastVisitAt: Joi.number(),
      expires: Joi.number(),
    });

    const { error, value: validated } = rules.validate(req.body, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(422, error.message);
    }

    const website = await AuroraDB.getWebsite(req.body.wid);

    if (!website) {
      throw new NotFoundError();
    }

    const ua = parse(req.headers["user-agent"]);
    const locale = tag(validated.language);

    const elements = [...ua.elements];

    // Also referrer (if any) in metadata
    if (validated.referrer && validated.referrer !== "") {
      elements.push({
        type: "referrer",
        value: dropProtocol(validated.referrer),
      });
    }

    // Also locale (if any) in metadata
    if (locale) {
      elements.push({
        type: "locale",
        value: locale.tag,
      });
    }

    const metadata = [];
    for (const index in elements) {
      const element = elements[index];

      let meta = await AuroraDB.client.metadata.findFirst({
        where: { ...element },
      });

      if (!meta) {
        meta = await AuroraDB.client.metadata.create({
          data: { ...element },
        });
      }

      metadata.push(meta);
    }

    const isBounce = !validated.lastPageViewID || validated.isNewSession;

    // If there is already a visit, remove the previous bounce
    if (!isBounce) {
      await AuroraDB.client.event.update({
        where: { id: validated.lastPageViewID },
        data: { is_a_bounce: false },
      });
    }

    // Create Event
    const event = await AuroraDB.client.event.create({
      data: {
        type: validated.type,
        element: validated.element,
        website_id: website.id,
        is_new_visitor: validated.isNewVisitor,
        is_new_session: validated.isNewSession,
        is_a_bounce: isBounce,
        metadata: {
          connect: metadata.map((meta) => ({ id: meta.id })),
        },
      },
      include: {
        metadata: true,
      },
    });

    return res.status(201).json(event);
};
