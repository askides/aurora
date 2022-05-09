import Joi from "joi";
import locale from "locale-codes";
import * as AuroraDB from "../database";
import { authentication } from "../middleware/authentication";
import { Controller } from "./controller";

export class MetadataController extends Controller {
  constructor(request, response) {
    super(request, response);
  }

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

    const data = await AuroraDB.getWebsiteViewsByMetadata(id, meta, filters);

    let metadata = {};

    data.forEach((element) => {
      const { value, events } = element;
      const unique = events.filter((event) => event.is_new_visitor);

      if (!metadata[value]) {
        metadata[value] = {
          views: events.length,
          unique: unique.length,
        };
      } else {
        metadata[value].views += events.length;
        metadata[value].unique += unique.length;
      }
    });

    metadata = Object.entries(metadata).reduce((acc, [value, data]) => {
      if (meta === "locale") {
        const { location } = locale.getByTag(value);
        return [...acc, { element: location, ...data }];
      }

      return [...acc, { element: value, ...data }];
    }, []);

    return this.res.status(200).json(metadata);
  }
}
