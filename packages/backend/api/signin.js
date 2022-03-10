import Joi from "joi";
import JWT from "jsonwebtoken";
import * as AuroraDB from "../lib/database";
import { AuthenticationError, ValidationError } from "../lib/error";
import { Router } from "../lib/router";
import { verify } from "../utils/hash";

export const AUTH_COOKIE = "aurorasession";
export const AUTH_COOKIE_LIFETIME = 60 * 60 * 24 * 1;
const JWT_SECRET = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // TODO: Move to env

const makeJwt = (data) => {
  return JWT.sign({ data: data }, JWT_SECRET, {
    expiresIn: AUTH_COOKIE_LIFETIME,
  });
};

export default async function handler(request, response) {
  const router = new Router(request, response);

  await router.route("POST", async ({ req, res }) => {
    const rules = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });

    const { error, value } = rules.validate(req.body);

    if (error) {
      throw new ValidationError(422, error.message);
    }

    const user = await AuroraDB.getUserByEmail(value.email);

    if (!user || !verify(value.password, user.password)) {
      throw new AuthenticationError(401, "Invalid credentials");
    }

    const { password, ...rest } = user;
    const accessToken = makeJwt(rest);

    return res.status(200).json({
      accessToken: accessToken,
      user: rest,
    });
  });

  router.fallback();
}
