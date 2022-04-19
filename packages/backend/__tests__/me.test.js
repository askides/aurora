import { createMocks } from "node-mocks-http";
import handler from "../api/me";
import * as AuroraDB from "../lib/database";
import { signInMock } from "../lib/jest";
import { buildUser } from "../utils/generate";
import { verify } from "../utils/hash";

beforeEach(async () => {
  await AuroraDB.client.user.deleteMany();
});

it("should return 401 if is not authenticated", async () => {
  const { req, res } = createMocks({ method: "GET" });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(401);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "No authorization header found",
    }
  `);
});

it("should return the user informations", async () => {
  const user = buildUser();
  await AuroraDB.createUser(user);
  const { accessToken } = await signInMock(user);

  const { req, res } = createMocks({
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(200);
  expect(res._getJSONData()).toMatchObject({
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    created_at: expect.any(String),
    updated_at: expect.any(String),
  });
});

it("should return 401 if is not authenticated", async () => {
  const { req, res } = createMocks({ method: "PUT" });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(401);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "No authorization header found",
    }
  `);
});

it("should update the user informations but not the password", async () => {
  const user = buildUser({ password: "password" });
  const createdUser = await AuroraDB.createUser(user);
  const { accessToken } = await signInMock(user);

  const { req, res } = createMocks({
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    body: {
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(200);
  expect(res._getJSONData()).toMatchObject({
    firstname: "John",
    lastname: "Doe",
    email: "john.doe@example.com",
    created_at: expect.any(String),
    updated_at: expect.any(String),
  });

  // Check the password is not updated
  const updatedUser = await AuroraDB.getUser(createdUser.id);
  expect(verify("password", updatedUser.password)).toBe(true);
});

it("should update the user informations and also the password", async () => {
  const user = buildUser({ password: "password" });
  const createdUser = await AuroraDB.createUser(user);
  const { accessToken } = await signInMock(user);

  const { req, res } = createMocks({
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    body: {
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      password: "newPassword",
      passwordConfirm: "newPassword",
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(200);
  expect(res._getJSONData()).toMatchObject({
    firstname: "John",
    lastname: "Doe",
    email: "john.doe@example.com",
    created_at: expect.any(String),
    updated_at: expect.any(String),
  });

  // Check the password is not updated
  const updatedUser = await AuroraDB.getUser(createdUser.id);
  expect(verify("password", updatedUser.password)).toBe(false);
  expect(verify("newPassword", updatedUser.password)).toBe(true);
});
