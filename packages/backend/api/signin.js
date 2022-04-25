import { AuthController } from "../lib/controllers/auth-controller";

export default async function handler(request, response) {
  const auth = new AuthController(request, response);

  switch (request.method) {
    case "POST":
      return await auth.run("signin");
    default:
      return response.status(405).json({ message: "Method not allowed" });
  }
}
