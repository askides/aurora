import { createMocks } from "node-mocks-http";
import handler from "../healthcheck";

describe("/api/healthcheck", () => {
  test("returns a nice message", async () => {
    const { req, res } = createMocks({
      method: "GET",
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: "Aurora APIs Works!",
      })
    );
  });
});
