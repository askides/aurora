import Joi from "joi";
import * as AuroraDB from "../lib/database";

/**
 * Important Node About Email
 *
 * Email already taken validation is not required as the
 * setup will works only if no users are present.
 */
export const schema = Joi.object({
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
});

export default async function handler(req, res) {
  /**
   * TODO:
   * We can also save a little reference into localstorage
   * to avoid querying the database everytime we need to
   * get the setup wizard.
   */
  const checkSetupIsNeeded = async () => {
    const users = await AuroraDB.getUsers();
    return users.length < 1;
  };

  const needsSetup = await checkSetupIsNeeded();

  if (!needsSetup) {
    return res.status(200).json({ needsSetup: false });
  }

  if (req.method === "GET") {
    return res.status(200).json({ needsSetup: true });
  }

  if (req.method === "POST") {
    const {
      error,
      value: { confirmPassword, ...body },
    } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const createdUser = await AuroraDB.createUser(body);
    return res.status(201).json({ data: createdUser });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
