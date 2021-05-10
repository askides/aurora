import { createMocks } from "node-mocks-http";
import handler from "../auth/login";

describe("/api/auth/login", () => {
  test("wrong login procedure", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        email: "thisisbullshit@example.com",
        password: "password",
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toMatchObject({ message: "Unauthorized" });
  });

  test("correct login procedure", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {
        email: "info@renatopozzi.me",
        password: "password",
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveProperty("access_token");
  });
});
