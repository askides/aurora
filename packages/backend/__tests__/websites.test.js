import { createMocks } from "node-mocks-http";
import handler from "../api/websites/index";
import { default as singleHandler } from "../api/websites/[id]";
import * as AuroraDB from "../lib/database";
import { signInMock } from "../lib/jest";
import { buildUser, buildWebsite } from "../utils/generate";

const user = buildUser({
  id: "FAKE_USER_ID",
  email: "hello@aurora.app",
  password: "password",
});

beforeEach(async () => {
  await AuroraDB.client.user.deleteMany();
  await AuroraDB.client.website.deleteMany();
  await AuroraDB.createUser(user);
});

it("should return 401 if we not pass the correct header", async () => {
  const { req, res } = createMocks({ method: "GET" });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(401);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "No authorization header found",
    }
  `);
});

it("should return 401 if we not pass the correct authorization header", async () => {
  const { req, res } = createMocks({
    method: "GET",
    headers: {
      authorization: "NonBearer token",
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(401);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "Invalid authorization header",
    }
  `);
});

it("should return 401 if we not pass the correct authorization token", async () => {
  const { req, res } = createMocks({
    method: "GET",
    headers: {
      authorization: "Bearer BadToken",
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(401);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "Invalid bearer token",
    }
  `);
});

it("should return the user websites", async () => {
  const { accessToken } = await signInMock(user);

  await AuroraDB.createWebsite(
    buildWebsite({ id: "FAKE_WEBSITE_ID", user_id: user.id })
  );

  const { req, res } = createMocks({
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(200);
  expect(res._getJSONData()).toHaveLength(1);
});

it("should return a specific user website", async () => {
  const { accessToken } = await signInMock(user);

  const website = buildWebsite({ id: "FAKE_WEBSITE_ID", user_id: user.id });
  await AuroraDB.createWebsite(website);

  const { req, res } = createMocks({
    method: "GET",
    query: {
      id: website.id,
    },
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  await singleHandler(req, res);

  expect(res._getStatusCode()).toBe(200);

  const data = res._getJSONData();
  expect(data.user_id).toBe(user.id);
  expect(data.id).toBe(website.id);
});

it("should return 422 because the name is required", async () => {
  const { accessToken } = await signInMock(user);
  const { name, ...website } = buildWebsite();
  const { req, res } = createMocks({
    method: "POST",
    body: website,
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(422);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "\\"name\\" is required",
    }
  `);
});

it("should return 422 because the url is required", async () => {
  const { accessToken } = await signInMock(user);
  const { url, ...website } = buildWebsite();
  const { req, res } = createMocks({
    method: "POST",
    body: website,
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(422);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "\\"url\\" is required",
    }
  `);
});

it("should return 422 because is_public is required", async () => {
  const { accessToken } = await signInMock(user);
  const { is_public, ...website } = buildWebsite();
  const { req, res } = createMocks({
    method: "POST",
    body: website,
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(422);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "\\"is_public\\" is required",
    }
  `);
});

it("should create a website for the user", async () => {
  const { accessToken } = await signInMock(user);
  const website = buildWebsite();
  const { req, res } = createMocks({
    method: "POST",
    body: website,
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(201);
  expect(res._getJSONData().user_id).toBe(user.id);
  // TODO: add more data
});
