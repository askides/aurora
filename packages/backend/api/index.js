import { Router } from "../lib/router";

export default async function handler(request, response) {
  const router = new Router(request, response);

  await router.route("GET", ({ res }) => {
    return res.status(200).json({ message: "Aurora APIs are running!" });
  });

  router.fallback();
}
