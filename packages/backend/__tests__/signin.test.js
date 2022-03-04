import handler from "../api/signin";
import * as AuroraDB from "../lib/database";
import {
  buildLoginReq,
  buildReq,
  buildRes,
  buildUser,
} from "../utils/generate";

beforeEach(async () => {
  await AuroraDB.client.user.deleteMany();
});

it("should return 401 because there are no users", async () => {
  const req = buildLoginReq();
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "message": "Invalid credentials",
    }
  `);
});

it("should return 401 because the password is wrong", async () => {
  const user = buildUser({ password: "THIS_IS_THE_PASSWORD" });
  await AuroraDB.createUser(user);

  const req = buildLoginReq();
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "message": "Invalid credentials",
    }
  `);
});

it("should return 200 and a token", async () => {
  const user = buildUser({ password: "THIS_IS_THE_PASSWORD" });
  const createdUser = await AuroraDB.createUser(user);

  const req = buildReq({
    method: "POST",
    body: {
      email: createdUser.email,
      password: "THIS_IS_THE_PASSWORD",
    },
  });
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json.mock.calls[0][0]).toMatchObject({
    accessToken: expect.any(String),
    user: {
      id: createdUser.id,
      email: createdUser.email,
      lastname: createdUser.lastname,
      firstname: createdUser.firstname,
    },
  });
});
