import { createMocks } from "node-mocks-http";
import signin from "../api/signin";

export const signInMock = async (user) => {
  const { req: signInReq, res: signInRes } = createMocks({
    method: "POST",
    body: {
      email: user.email,
      password: user.password,
    },
  });

  await signin(signInReq, signInRes);

  expect(signInRes._getStatusCode()).toBe(200);

  return signInRes._getJSONData();
};
