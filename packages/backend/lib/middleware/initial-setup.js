import * as AuroraDB from "../database";
import { ApiError } from "../error";

export const initialSetup = async () => {
  const users = await AuroraDB.getUsers();

  if (users.length > 0) {
    throw new ApiError(400, "The setup is already done");
  }
};
