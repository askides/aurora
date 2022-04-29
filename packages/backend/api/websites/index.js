import { WebsiteController } from "../../lib/controllers/website-controller";
import { withPreflight } from "../../lib/middleware/with-preflight";

const handler = async (request, response) => {
  const website = new WebsiteController(request, response);

  switch (request.method) {
    case "GET":
      return await website.run("index");
    case "POST":
      return await website.run("store");
    default:
      return response.status(405).json({ error: "Method not allowed" });
  }
};

export default withPreflight(handler);
