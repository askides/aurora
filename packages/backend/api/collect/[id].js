import { CollectController } from "../../lib/controllers/collect-controller";
import { withPreflight } from "../../lib/middleware/with-preflight";

const handler = async (request, response) => {
  const collect = new CollectController(request, response);

  switch (request.method) {
    // I know this is a POST and not a PUT but sendBeacon is a POST
    case "POST":
      return await collect.run("update");
    default:
      return response.status(405).json({ error: "Method not allowed" });
  }
};

export default withPreflight(handler);
