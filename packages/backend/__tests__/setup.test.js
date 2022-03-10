import { createMocks } from "node-mocks-http";
import handler from "../api/setup";
import * as AuroraDB from "../lib/database";
import { buildUser } from "../utils/generate";

beforeEach(async () => {
  await AuroraDB.client.user.deleteMany();
});

describe("non allowed methods should not work", () => {
  const disallowedMethods = ["PUT", "PATCH", "DELETE"];

  disallowedMethods.forEach((method) => {
    it(`should return 405 for ${method}`, async () => {
      const { req, res } = createMocks({ method });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(res._getJSONData()).toEqual({ message: "Method not allowed" });
    });
  });
});

it("should return that the setup is needed", async () => {
  const { req, res } = createMocks({
    method: "GET",
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(200);
  expect(res._getJSONData()).toEqual({ needsSetup: true });
});

it("should return that the setup is not needed", async () => {
  const { req, res } = createMocks({
    method: "GET",
  });

  await AuroraDB.createUser(buildUser());
  await handler(req, res);

  expect(res._getStatusCode()).toBe(400);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "The setup is already done",
    }
  `);
});

it("should create an user", async () => {
  const user = buildUser({}, { timestamps: false });
  const { req, res } = createMocks({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(201);
  expect(res._getJSONData().data).toMatchObject({
    ...user,
    password: expect.any(String),
  });

  // Ensure that the user is created
  const createdUser = await AuroraDB.getUser(res._getJSONData().data.id);
  expect(createdUser).toBeDefined();
});

it("should return an error when the password is not valid", async () => {
  const user = buildUser({ password: "12345" }, { timestamps: false });
  const { req, res } = createMocks({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(422);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "\\"password\\" length must be at least 8 characters long",
    }
  `);
});

it("should return an error when the password is not confirmed", async () => {
  const user = buildUser(
    { password: "12345678", confirmPassword: "123456789" },
    { timestamps: false }
  );

  const { req, res } = createMocks({
    method: "POST",
    body: { ...user },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(422);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "\\"confirmPassword\\" must be [ref:password]",
    }
  `);
});

it("should return an error when the email is not valid", async () => {
  const user = buildUser({ email: "notanemail" }, { timestamps: false });

  const { req, res } = createMocks({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
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

it("should return an error when firstname is not valid", async () => {
  const user = buildUser({ firstname: null }, { timestamps: false });

  const { req, res } = createMocks({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(422);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "\\"firstname\\" must be a string",
    }
  `);
});

it("should return an error when lastname is not valid", async () => {
  const user = buildUser({ lastname: null }, { timestamps: false });

  const { req, res } = createMocks({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(422);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "\\"lastname\\" must be a string",
    }
  `);
});
