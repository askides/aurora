import { SetupController } from "../lib/controllers/setup-controller";
import { withPreflight } from "../lib/middleware/with-preflight";

// TODO: Redirect to signin after setup completed (to be moved to frontend)

const handler = async (request, response) => {
  const setup = new SetupController(request, response);

  switch (request.method) {
    case "GET":
      return await setup.run("index");
    case "POST":
      return await setup.run("store");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
};

export default withPreflight(handler);
