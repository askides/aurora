import { MeController } from "../lib/controllers/me-controller";
import { authentication } from "../lib/middleware/authentication";
import { Router } from "../lib/router";

export default async function handler(request, response) {
  const router = new Router(request, response);

  await router.use(authentication);
  await router.route("GET", MeController.index);
  await router.route("PUT", MeController.update);

  router.fallback();
}
