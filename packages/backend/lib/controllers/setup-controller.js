import Joi from "joi";
import * as AuroraDB from "../database";
import { Controller } from "./controller";

export class SetupController extends Controller {
  async index() {
    const users = await AuroraDB.getUsers();

    if (users.length > 0) {
      return this.res.status(200).json({ needsSetup: false });
    }

    return this.res.status(200).json({ needsSetup: true });
  }

  async store() {
    const rules = Joi.object({
      firstname: Joi.string().required(),
      lastname: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
    });

    const { confirmPassword, ...validated } = this.validate(
      this.req.body,
      rules
    );

    const user = await AuroraDB.createUser(validated);

    return this.res.status(201).json(user);
  }
}
