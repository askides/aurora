import Joi from "joi";
import * as AuroraDB from "../database";
import { authentication } from "../middleware/authentication";
import { Controller } from "./controller";

export class StatisticsController extends Controller {
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
    });

    this.validate(this.req.query, rules);

    const { meta, ...filters } = this.req.query;

    const data = await AuroraDB.getWebsiteStatistics(id, filters);

    // TODO: Refactor this as well as the getWebsiteStatistics function
    return this.res.status(200).json({
      visits: data.visits._count._all,
      uniqueVisits: data.uniqueVisits._count._all,
      bounces: data.bounces._count._all,
      sessions: data.sessions._count._all,
      avgDuration: data.avgDuration._avg.duration || 0,
    });
  }
}
