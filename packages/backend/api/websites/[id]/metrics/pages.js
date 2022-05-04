import { PagesController } from "../../../../lib/controllers/pages-controller";
import { withPreflight } from "../../../../lib/middleware/with-preflight";

const handler = async (request, response) => {
  const pages = new PagesController(request, response);

  switch (request.method) {
    case "GET":
      return await pages.run("index");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
};

export default withPreflight(handler);
