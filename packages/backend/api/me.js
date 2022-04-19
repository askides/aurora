import { authentication } from "../lib/middleware/authentication";
import { Router } from "../lib/router";

export default async function handler(request, response) {
  const router = new Router(request, response);

  await router.use(authentication);

  await router.route("GET", ({ req, res }) => {
    const { id, password, ...rest } = req.user;
    return res.status(200).json(rest);
  });

  router.fallback();
}
