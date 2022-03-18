import { createMocks } from "node-mocks-http";
import handler from "../api/websites/[id]";
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

describe("GET /websites/:id", () => {
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

  it("should return 404 if the website does not exist", async () => {
    const { accessToken } = await signInMock(user);

    const { req, res } = createMocks({
      method: "GET",
      query: { id: "NON_EXISTENT_WEBSITE_ID" },
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData()).toMatchInlineSnapshot(`
      Object {
        "message": "Not found",
      }
    `);
  });

  it("should return 403 if the website is not owned by the user", async () => {
    const { accessToken } = await signInMock(user);

    await AuroraDB.createWebsite(
      buildWebsite({ id: "A_WEBSITE_ID", user_id: "ANOTHER_USER_ID" })
    );

    const { req, res } = createMocks({
      method: "GET",
      query: { id: "A_WEBSITE_ID" },
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData()).toMatchInlineSnapshot(`
      Object {
        "message": "Unhauthorized",
      }
    `);
  });

  it("should return the user website", async () => {
    const { accessToken } = await signInMock(user);

    await AuroraDB.createWebsite(
      buildWebsite({ id: "FAKE_WEBSITE_ID", user_id: user.id })
    );

    const { req, res } = createMocks({
      method: "GET",
      query: { id: "FAKE_WEBSITE_ID" },
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().user_id).toBe(user.id);
  });
});

describe("PUT /websites/:id", () => {
  it("should return 401 if we not pass the correct header", async () => {
    const { req, res } = createMocks({ method: "PUT" });

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
      method: "PUT",
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
      method: "PUT",
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

  it("should return 404 if the website does not exist", async () => {
    const { accessToken } = await signInMock(user);

    const { req, res } = createMocks({
      method: "PUT",
      query: { id: "NON_EXISTENT_WEBSITE_ID" },
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData()).toMatchInlineSnapshot(`
      Object {
        "message": "Not found",
      }
    `);
  });

  it("should return 403 if the website is not owned by the user", async () => {
    const { accessToken } = await signInMock(user);

    await AuroraDB.createWebsite(
      buildWebsite({ id: "A_WEBSITE_ID", user_id: "ANOTHER_USER_ID" })
    );

    const { req, res } = createMocks({
      method: "PUT",
      query: { id: "A_WEBSITE_ID" },
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData()).toMatchInlineSnapshot(`
      Object {
        "message": "Unhauthorized",
      }
    `);
  });

  it("should return 422 because the name is required", async () => {
    await AuroraDB.createWebsite(
      buildWebsite({ id: "FAKE_WEBSITE_ID", user_id: user.id })
    );

    const { accessToken } = await signInMock(user);
    const { name, ...website } = buildWebsite();
    const { req, res } = createMocks({
      method: "PUT",
      query: { id: "FAKE_WEBSITE_ID" },
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
    await AuroraDB.createWebsite(
      buildWebsite({ id: "FAKE_WEBSITE_ID", user_id: user.id })
    );

    const { accessToken } = await signInMock(user);
    const { url, ...website } = buildWebsite();
    const { req, res } = createMocks({
      method: "PUT",
      query: { id: "FAKE_WEBSITE_ID" },
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
    await AuroraDB.createWebsite(
      buildWebsite({ id: "FAKE_WEBSITE_ID", user_id: user.id })
    );

    const { accessToken } = await signInMock(user);
    const { is_public, ...website } = buildWebsite();
    const { req, res } = createMocks({
      method: "PUT",
      query: { id: "FAKE_WEBSITE_ID" },
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

  it("should update the website", async () => {
    await AuroraDB.createWebsite(
      buildWebsite({ id: "FAKE_WEBSITE_ID", user_id: user.id })
    );

    const { accessToken } = await signInMock(user);
    const website = buildWebsite({ url: "https://example.com" });
    const { req, res } = createMocks({
      method: "PUT",
      query: { id: "FAKE_WEBSITE_ID" },
      body: website,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().url).toBe(website.url);
  });
});
