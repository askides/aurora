import { createMocks } from "node-mocks-http";
import handler from "../../../pages/api/me/index";

describe("/api/me", () => {
  test("testing unauthenticated call", async () => {
    const { req, res } = createMocks({
      method: "GET",
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });
});
