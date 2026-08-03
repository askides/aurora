import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Authenticated app shell — the layout loader is the auth gate.
  layout("layouts/app.tsx", [
    index("routes/websites.tsx"),
    route("account", "routes/account.tsx"),
    route("websites/new", "routes/websites.new.tsx"),
    route("websites/:id/edit", "routes/websites.edit.tsx"),
    route("websites/:id/analytics", "routes/analytics.tsx"),
  ]),

  // Public dashboard for websites flagged is_public.
  route("websites/:id/s/analytics", "routes/analytics.public.tsx"),

  route("signin", "routes/signin.tsx"),
  route("setup", "routes/setup.tsx"),
  route("logout", "routes/logout.tsx"),

  // Resource routes hit by the tracker script from third-party origins.
  route("collect", "routes/collect.ts"),
  route("collect/:id", "routes/collect.$id.ts"),

  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
