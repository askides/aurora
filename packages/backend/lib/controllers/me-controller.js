import Joi from "joi";
import * as AuroraDB from "../database";
import { authentication } from "../middleware/authentication";
import { Controller } from "./controller";

export class MeController extends Controller {
  constructor(request, response) {
    super(request, response);
    this.middleware(authentication);
  }

  async index() {
    const { id, password, ...rest } = this.req.user;
    return this.res.status(200).json(rest);
  }

  async update() {
    const rules = Joi.object({
      firstname: Joi.string().required(),
      lastname: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8),
      confirmPassword: Joi.string().valid(Joi.ref("password")),
    });

    const { confirmPassword, ...validated } = this.validate(
      this.req.body,
      rules
    );

    const user = await AuroraDB.updateUser(this.req.user.id, validated);

    return this.res.status(200).json(user);
  }
}
