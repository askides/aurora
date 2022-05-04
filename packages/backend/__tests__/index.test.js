import { createMocks } from "node-mocks-http";
import handler from "../api/index";

it("should return 200 and a message", async () => {
  const { req, res } = createMocks({ method: "GET" });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(200);
  expect(res._getJSONData()).toMatchInlineSnapshot(`
    Object {
      "message": "Aurora APIs are running!",
    }
  `);
});
