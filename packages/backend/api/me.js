import { MeController } from "../lib/controllers/me-controller";
import { withPreflight } from "../lib/middleware/with-preflight";

const handler = async (request, response) => {
  const me = new MeController(request, response);

  switch (request.method) {
    case "GET":
      return await me.run("index");
    case "PUT":
      return await me.run("update");
    default:
      return response.status(405).json({ error: "Method not allowed" });
  }
};

export default withPreflight(handler);
