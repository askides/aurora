import { CollectController } from "../lib/controllers/collect-controller";
import { Router } from "../lib/router";

export default async function handler(request, response) {
  const router = new Router(request, response);

  await router.route("POST", CollectController.store);

  router.fallback();
}
