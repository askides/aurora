import { createMocks } from "node-mocks-http";
import handler from "../api/signin";
import * as AuroraDB from "../lib/database";
import { buildLoginReq, buildUser } from "../utils/generate";

beforeEach(async () => {
  await AuroraDB.client.user.deleteMany();
});

describe("non allowed methods should not work", () => {
  const disallowedMethods = ["GET", "PUT", "PATCH", "DELETE"];

  disallowedMethods.forEach((method) => {
    it(`should return 405 for ${method}`, async () => {
      const { req, res } = createMocks({ method });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(res._getJSONData()).toEqual({ message: "Method not allowed" });
    });
  });
});

it("should return 401 because there are no users", async () => {
  const { req, res } = createMocks(buildLoginReq());

  await handler(req, res);

  expect(res._getStatusCode()).toBe(401);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "Invalid credentials",
    }
  `);
});

it("should return 401 because the password is wrong", async () => {
  const user = buildUser({ password: "THIS_IS_THE_PASSWORD" });

  await AuroraDB.createUser(user);

  const { req, res } = createMocks(buildLoginReq());

  await handler(req, res);

  expect(res._getStatusCode()).toBe(401);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "Invalid credentials",
    }
  `);
});

it("should return 200 and a token", async () => {
  const user = buildUser({ password: "THIS_IS_THE_PASSWORD" });
  const createdUser = await AuroraDB.createUser(user);

  const { req, res } = createMocks({
    method: "POST",
    body: {
      email: createdUser.email,
      password: "THIS_IS_THE_PASSWORD",
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(200);
  expect(res._getJSONData()).toMatchObject({
    accessToken: expect.any(String),
    user: {
      id: createdUser.id,
      email: createdUser.email,
      lastname: createdUser.lastname,
      firstname: createdUser.firstname,
    },
  });
});

it("should returl 422 because the email is not valid", async () => {
  const { req, res } = createMocks({
    method: "POST",
    body: {
      email: "not_an_email",
      password: "THIS_IS_THE_PASSWORD",
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(422);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "\\"email\\" must be a valid email",
    }
  `);
});
