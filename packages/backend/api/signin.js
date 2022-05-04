import { AuthController } from "../lib/controllers/auth-controller";
import { withPreflight } from "../lib/middleware/with-preflight";

const handler = async (request, response) => {
  const auth = new AuthController(request, response);

  switch (request.method) {
    case "POST":
      return await auth.run("signin");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
};

export default withPreflight(handler);
