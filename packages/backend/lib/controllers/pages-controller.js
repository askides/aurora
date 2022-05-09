import Joi from "joi";
import * as AuroraDB from "../database";
import { authentication } from "../middleware/authentication";
import { Controller } from "./controller";

export class PagesController extends Controller {
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

    const { ...filters } = this.req.query;

    const data = await AuroraDB.getWebsiteViewsByPage(id, filters);

    let pages = {};

    data.forEach((event) => {
      const { element } = event;

      if (!pages[element]) {
        pages[element] = {
          views: 0,
          unique: 0,
        };
      }

      pages[element].views += 1;
      pages[element].unique += event.is_new_visitor ? 1 : 0;
    });

    pages = Object.entries(pages).reduce((acc, [page, data]) => {
      return [...acc, { element: page, ...data }];
    }, []);

    return this.res.status(200).json(pages);
  }
}
