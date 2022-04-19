import Joi from "joi";
import * as AuroraDB from "../database";
import { ValidationError } from "../error";

export const MeController = {
  index: async ({ req, res }) => {
    const { id, password, ...rest } = req.user;
    return res.status(200).json(rest);
  },

  update: async ({ req, res }) => {
    const rules = Joi.object({
      firstname: Joi.string().required(),
      lastname: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8),
      confirmPassword: Joi.string().valid(Joi.ref("password")),
    });

    const {
      error,
      value: { confirmPassword, ...validated },
    } = rules.validate(req.body, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(422, error.message);
    }

    const updatedUser = await AuroraDB.updateUser(req.user.id, validated);

    return res.status(200).json(updatedUser);
  },
};
