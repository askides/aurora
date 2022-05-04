import Joi from "joi";
import * as AuroraDB from "../database";
import { authentication } from "../middleware/authentication";
import { Controller } from "./controller";

export class WebsiteController extends Controller {
  constructor(request, response) {
    super(request, response);
    this.middleware(authentication);
  }

  async index() {
    const { id } = this.req.user;
    const websites = await AuroraDB.getUserWebsites(id);
    return this.res.status(200).json(websites);
  }

  async show() {
    const website = await AuroraDB.getWebsite(this.req.query.id);

    if (!website) {
      this.abort(404);
    }

    if (website.user_id !== this.req.user.id) {
      this.abort(403);
    }

    return this.res.status(200).json(website);
  }

  async store() {
    const rules = Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      is_public: Joi.boolean().required(),
    });

    const validated = this.validate(this.req.body, rules);

    const website = await AuroraDB.createWebsite({
      user_id: this.req.user.id,
      ...validated,
    });

    return this.res.status(201).json(website);
  }

  async update() {
    const website = await AuroraDB.getWebsite(this.req.query.id);

    if (!website) {
      this.abort(404);
    }

    if (website.user_id !== this.req.user.id) {
      this.abort(403);
    }

    const rules = Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      is_public: Joi.boolean().required(),
    });

    const validated = this.validate(this.req.body, rules);

    const updatedWebsite = await AuroraDB.updateWebsite(
      this.req.query.id,
      validated
    );

    return this.res.status(200).json(updatedWebsite);
  }

  async destroy() {
    const { id } = this.req.query;
    const website = await AuroraDB.deleteWebsite(id);
    return this.res.status(200).json(website);
  }
}
