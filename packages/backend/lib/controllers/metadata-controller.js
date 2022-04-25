import Joi from "joi";
import * as AuroraDB from "../database";
import { UnhauthorizedError } from "../error";
import { authentication } from "../middleware/authentication";
import { Controller } from "./controller";

export class MetadataController extends Controller {
  constructor(request, response) {
    super(request, response);
    this.middleware(authentication);
  }

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

    const data = await AuroraDB.getWebsiteViewsByMetadata(
      this.req.query.id,
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
  }
}
