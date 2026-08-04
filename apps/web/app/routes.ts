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
  route("signup", "routes/signup.tsx"),
  route("signout", "routes/signout.tsx"),

  // Resource routes hit by the tracker script from third-party origins.
  route("collect", "routes/api/collect.ts"),
  // A fixed path, not `collect/:id`: the duration beacon names its view by the
  // tracker's own ephemeral token in the body, so the event id never has to be
  // handed to a third-party origin in the first place.
  route("collect/duration", "routes/api/collect.duration.ts"),

  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
