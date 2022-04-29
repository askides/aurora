import { MetadataController } from "../../../../lib/controllers/metadata-controller";
import { withPreflight } from "../../../../lib/middleware/with-preflight";

const handler = async (request, response) => {
  const metadata = new MetadataController(request, response);

  switch (request.method) {
    case "GET":
      return await metadata.run("index");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
};

export default withPreflight(handler);
