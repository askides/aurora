import { MetadataController } from "../../../../lib/controllers/metadata-controller";

export default async function handler(request, response) {
  const metadata = new MetadataController(request, response);

  switch (request.method) {
    case "GET":
      return await metadata.run("index");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
}
