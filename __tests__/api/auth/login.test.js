import { createMocks } from "node-mocks-http";
import handler from "../../../pages/api/auth/login";

describe("/api/auth/login", () => {
  test("testing non working get method", async () => {
    const { req, res } = createMocks({
      method: "GET",
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  test("testing login with wrong password", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        email: "nonexistinguser",
        password: "password",
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: "Unauthorized",
      })
    );
  });

  test("testing login with correct data", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        email: "info@renatopozzi.me",
        password: "password",
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()).toHaveProperty("set-cookie");
    expect(JSON.parse(res._getData())).toHaveProperty("access_token");
  });
});
