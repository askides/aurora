import { SetupController } from "../lib/controllers/setup-controller";

export default async function handler(request, response) {
  const setup = new SetupController(request, response);

  switch (request.method) {
    case "GET":
      return await setup.run("index");
    case "POST":
      return await setup.run("store");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
}
