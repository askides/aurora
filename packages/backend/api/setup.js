import { SetupController } from "../lib/controllers/setup-controller";
import { initialSetup } from "../lib/middleware/initial-setup";
import { Router } from "../lib/router";

export default async function handler(request, response) {
  const router = new Router(request, response);

  await router.use(initialSetup);
  await router.route("GET", SetupController.index);
  await router.route("POST", SetupController.store);

  router.fallback();
}
