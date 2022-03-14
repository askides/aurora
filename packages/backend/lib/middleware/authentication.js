import JWT from "jsonwebtoken";
import * as AuroraDB from "../database";
import { AuthenticationError } from "../error";

const JWT_SECRET = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // TODO: Move to env

const verifyJwt = (accessToken) => {
  try {
    return JWT.verify(accessToken, JWT_SECRET);
  } catch (err) {
    throw new AuthenticationError(401, "Invalid bearer token");
  }
};

export const authentication = async ({ req }) => {
  const { authorization } = req.headers;

  if (!authorization) {
    throw new AuthenticationError(401, "No authorization header found");
  }

  const [type, accessToken] = authorization.split(" ");

  if (type !== "Bearer") {
    throw new AuthenticationError(401, "Invalid authorization header");
  }

  const tokenPayload = verifyJwt(accessToken);

  const user = await AuroraDB.getUser(tokenPayload.data.id);

  if (!user) {
    throw new AuthenticationError();
  }

  req.user = user;
};
