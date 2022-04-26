import Joi from "joi";
import * as AuroraDB from "../database";
import { authentication } from "../middleware/authentication";
import { Controller } from "./controller";

export class TimeseriesController extends Controller {
  async index() {
    const { id } = this.req.query;
    const website = await AuroraDB.getWebsite(id);

    if (!website) {
      this.abort(404);
    }

    if (!website.is_public) {
      await authentication(this.req, this.res);

      if (this.req.user.id !== website.user_id) {
        this.abort(403);
      }
    }

    const rules = Joi.object({
      start: Joi.string().required(),
      end: Joi.string().required(),
      unit: Joi.string().required().valid("hour", "day", "month", "year"),
      tz: Joi.string().required(),
    });

    this.validate(this.req.query, rules);

    const filters = {
      start: this.req.query.start,
      end: this.req.query.end,
      unit: this.req.query.unit,
      tz: this.req.query.tz || "UTC",
    };

    const data = await AuroraDB.getWebsiteViewsTimeSeries(id, filters);

    const dropTime = (date) => {
      return date.toISOString().split("T")[0];
    };

    const timeseries = data.map((element) => {
      const date = dropTime(new Date(element.ts));

      return {
        timeseries: date,
        count: element.count,
      };
    });

    return this.res.status(200).json(timeseries);
  }
}
