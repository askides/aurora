import Joi from "joi";
import * as AuroraDB from "../database";
import { NotFoundError, UnhauthorizedError, ValidationError } from "../error";

export const WebsiteController = {
  index: async ({ req, res }) => {
    const websites = await AuroraDB.getUserWebsites(req.user.id);
    return res.status(200).json(websites);
  },

  show: async ({ req, res }) => {
    const website = await AuroraDB.getWebsite(req.query.id);

    if (!website) {
      throw new NotFoundError();
    }

    if (website.user_id !== req.user.id) {
      throw new UnhauthorizedError();
    }

    return res.status(200).json(website);
  },

  store: async ({ req, res }) => {
    const rules = Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      is_public: Joi.boolean().required(),
    });

    const { error, value: validated } = rules.validate(req.body, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(422, error.message);
    }

    const createdWebsite = await AuroraDB.createWebsite({
      user_id: req.user.id,
      ...validated,
    });

    return res.status(201).json(createdWebsite);
  },

  update: async ({ req, res }) => {
    // Check if website exists
    const website = await AuroraDB.getWebsite(req.query.id);

    if (!website) {
      throw new NotFoundError();
    }

    if (website.user_id !== req.user.id) {
      throw new UnhauthorizedError();
    }

    const rules = Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      is_public: Joi.boolean().required(),
    });

    // TODO: Find a way to apply validation in a concise way
    const { error, value: validated } = rules.validate(req.body, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(422, error.message);
    }

    const updatedWebsite = await AuroraDB.updateWebsite(
      req.query.id,
      validated
    );

    return res.status(200).json(updatedWebsite);
  },

  destroy: async ({ req, res }) => {
    const deletedWebsite = await AuroraDB.deleteWebsite(req.query.id);
    return res.status(200).json({ data: deletedWebsite });
  },
};
