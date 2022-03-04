import handler from "../api/index";
import { buildReq, buildRes } from "../utils/generate";

it("should return 200 and a message", async () => {
  const req = buildReq();
  const res = buildRes();

  await handler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "message": "Aurora APIs are running!",
    }
  `);
});
