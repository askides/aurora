import Joi from "joi";
import JWT from "jsonwebtoken";
import { verify } from "../../lib/utils/hash";
import * as AuroraDB from "../database";
import { Controller } from "./controller";

const JWT_EXPIRES = 60 * 60 * 24 * 1;
const JWT_SECRET = process.env.JWT_SECRET;

const makeJwt = (data) => {
  return JWT.sign({ data: data }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
};

export class AuthController extends Controller {
  async signin() {
    const rules = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });

    const validated = this.validate(this.req.body, rules);

    const user = await AuroraDB.getUserByEmail(validated.email);

    if (!user || !verify(validated.password, user.password)) {
      this.abort(401);
    }

    const { password, ...rest } = user;
    const accessToken = makeJwt(rest);

    return this.res.status(200).json({
      accessToken: accessToken,
      user: rest,
    });
  }
}
