import handler from "../api/setup";
import * as AuroraDB from "../lib/database";
import { buildReq, buildRes, buildUser } from "../utils/generate";

beforeEach(async () => {
  await AuroraDB.client.user.deleteMany();
});

describe("non allowed methods should not work", () => {
  const disallowedMethods = ["PUT", "PATCH", "DELETE"];

  disallowedMethods.forEach((method) => {
    it(`should return 405 for ${method}`, async () => {
      const req = buildReq({ method: method });
      const res = buildRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ message: "Method not allowed" });
    });
  });
});

it("should return that the setup is needed", async () => {
  const req = buildReq({ method: "GET" });
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ needsSetup: true });
});

it("should return that the setup is not needed", async () => {
  const req = buildReq({ method: "GET" });
  const res = buildRes();

  await AuroraDB.createUser(buildUser());
  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ needsSetup: false });
});

it("should create an user", async () => {
  const user = buildUser({}, { timestamps: false });
  const req = buildReq({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
    },
  });
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(201);

  // Ensure that the user is created
  const createdUser = await AuroraDB.getUser(res.json.mock.calls[0][0].data.id);
  expect(createdUser).toBeDefined();
});

it("should return an error when the password is not valid", async () => {
  const user = buildUser({ password: "12345" }, { timestamps: false });
  const req = buildReq({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
    },
  });
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
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
  const req = buildReq({
    method: "POST",
    body: { ...user },
  });
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "message": "\\"confirmPassword\\" must be [ref:password]",
    }
  `);
});

it("should return an error when the email is not valid", async () => {
  const user = buildUser({ email: "notanemail" }, { timestamps: false });
  const req = buildReq({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
    },
  });
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "message": "\\"email\\" must be a valid email",
    }
  `);
});

it("should return an error when firstname is not valid", async () => {
  const user = buildUser({ firstname: null }, { timestamps: false });
  const req = buildReq({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
    },
  });
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "message": "\\"firstname\\" must be a string",
    }
  `);
});

it("should return an error when lastname is not valid", async () => {
  const user = buildUser({ lastname: null }, { timestamps: false });
  const req = buildReq({
    method: "POST",
    body: {
      ...user,
      confirmPassword: user.password,
    },
  });
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "message": "\\"lastname\\" must be a string",
    }
  `);
});
