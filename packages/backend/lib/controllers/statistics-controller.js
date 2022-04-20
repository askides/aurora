import Joi from "joi";
import * as AuroraDB from "../database";
import { UnhauthorizedError, ValidationError } from "../error";

export const StatisticsController = {
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

    const data = await AuroraDB.getWebsiteStatistics(req.query.id, filters);

    return res.status(200).json({
      visits: data.visits._count._all,
      uniqueVisits: data.uniqueVisits._count._all,
      bounces: data.bounces._count._all,
      sessions: data.sessions._count._all,
      avgDuration: data.avgDuration._avg._all || 0,
    });
  },
};
