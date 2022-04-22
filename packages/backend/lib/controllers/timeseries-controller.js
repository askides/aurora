import Joi from "joi";
import * as AuroraDB from "../database";
import { NotFoundError, UnhauthorizedError, ValidationError } from "../error";

export const TimeseriesController = {
  index: async ({ req, res }) => {
    const website = await AuroraDB.getWebsite(req.query.id);

    if (!website) {
      throw new NotFoundError();
    }

    // TODO: This route will be also public.
    if (!website.is_public && website.user_id !== req.user.id) {
      throw new UnhauthorizedError();
    }

    const rules = Joi.object({
      start: Joi.string().required(),
      end: Joi.string().required(),
      unit: Joi.string().required().valid("hour", "day", "month", "year"),
      // tz: Joi.string().required(),
    });

    const { error, value: validated } = rules.validate(req.query, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(422, error.message);
    }

    const filters = {
      start: req.query.start,
      end: req.query.end,
      unit: req.query.unit,
      tz: req.query.tz || "UTC",
    };

    const data = await AuroraDB.getWebsiteViewsTimeSeries(
      req.query.wid,
      filters
    );

    // const formattedData = data.map((item) => {
    //   return {
    //     timeseries: dropTime(new Date(item.ts)),
    //     count: item.count,
    //   };
    // });

    return res.status(200).json([]);
  },
};
