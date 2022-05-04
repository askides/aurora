import { CollectController } from "../../lib/controllers/collect-controller";
import { withPreflight } from "../../lib/middleware/with-preflight";

const handler = async (request, response) => {
  const collect = new CollectController(request, response);

  switch (request.method) {
    case "POST":
      return await collect.run("store");
    default:
      return response.status(405).json({ error: "Method not allowed" });
  }
};

export default withPreflight(handler);
