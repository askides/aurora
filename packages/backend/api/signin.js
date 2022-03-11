import { AuthController } from "../lib/controllers/auth-controller";
import { Router } from "../lib/router";

export default async function handler(request, response) {
  const router = new Router(request, response);

  await router.route("POST", AuthController.signin);

  router.fallback();
}
