import { WebsiteController } from "../../lib/controllers/website-controller";

export default async function handler(request, response) {
  const website = new WebsiteController(request, response);

  switch (request.method) {
    case "GET":
      return await website.run("index");
    case "POST":
      return await website.run("store");
    default:
      return response.status(405).json({ error: "Method not allowed" });
  }
}
