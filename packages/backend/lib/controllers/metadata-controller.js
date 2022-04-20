import Joi from "joi";
import * as AuroraDB from "../database";
import { UnhauthorizedError, ValidationError } from "../error";

export const MetadataController = {
  index: async ({ req, res }) => {
    const website = await AuroraDB.getWebsite(req.query.id);

    // TODO: This route will be also public.
    if (!website.is_public && website.user_id !== req.user.id) {
      throw new UnhauthorizedError();
    }

    const rules = Joi.object({
      start: Joi.string().required(),
      end: Joi.string().required(),
      //unit: Joi.string().required().valid("hour", "day", "month", "year"),
    });

    const { error, value: validated } = rules.validate(req.query, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(422, error.message);
    }

    const { meta, ...filters } = req.query;

    const data = await AuroraDB.getWebsiteViewsByMetadata(
      req.query.id,
      meta,
      filters
    );

    const unique = (el) => el.is_new_visitor;

    // TODO: check duplicated values
    const mapped = data.map((el) => {
      return {
        element: el.value,
        views: el.events.length,
        unique: el.events.filter(unique).length,
      };
    });

    return res.status(200).json(mapped);
  },
};
