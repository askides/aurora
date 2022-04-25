import Joi from "joi";
import * as AuroraDB from "../database";
import { UnhauthorizedError } from "../error";
import { Controller } from "./controller";

export class StatisticsController extends Controller {
  async index() {
    const website = await AuroraDB.getWebsite(this.req.query.id);

    // TODO: This route will be also public.
    if (!website.is_public && website.user_id !== this.req.user.id) {
      throw new UnhauthorizedError();
    }

    const rules = Joi.object({
      start: Joi.string().required(),
      end: Joi.string().required(),
      //unit: Joi.string().required().valid("hour", "day", "month", "year"),
    });

    const validated = this.validate(this.req.query, rules);

    const { meta, ...filters } = req.query;

    const data = await AuroraDB.getWebsiteStatistics(
      this.req.query.id,
      filters
    );

    return this.res.status(200).json({
      visits: data.visits._count._all,
      uniqueVisits: data.uniqueVisits._count._all,
      bounces: data.bounces._count._all,
      sessions: data.sessions._count._all,
      avgDuration: data.avgDuration._avg._all || 0,
    });
  }
}
