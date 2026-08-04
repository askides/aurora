import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { Logo } from "~/shared/components/logo";
import { Button } from "~/shared/ui/button";
import { Toaster } from "~/shared/ui/sonner";
import { TooltipProvider } from "~/shared/ui/tooltip";

import type { Route } from "./+types/root";
import "./app.css";

export const meta: Route.MetaFunction = () => [
  { title: "Aurora" },
  {
    name: "description",
    content: "Aurora — 100% cookie-free open website analytics.",
  },
];

/**
 * Applies the stored theme before first paint so there is no flash. Kept out of
 * React so the server-rendered markup and the hydrated tree stay identical.
 */
const themeScript = `
try {
  var stored = localStorage.getItem("aurora-theme");
  var dark = stored ? stored === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (dark) document.documentElement.classList.add("dark");
} catch (e) {}
`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let status = "Error";
  let message = "Something went wrong";
  let details = "The page couldn't be loaded. Try again in a moment.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    status = String(error.status);
    message = error.status === 404 ? "Page not found" : "Request failed";
    details =
      error.status === 404
        ? "This page doesn't exist, or it moved somewhere else."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-sidebar p-6">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <Logo className="size-6" />
          <span className="text-eyebrow text-muted-foreground">{status}</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{message}</h1>
          <p className="text-sm text-muted-foreground">{details}</p>
        </div>

        <div>
          <Button render={<Link to="/" />}>Back to websites</Button>
        </div>

        {stack && (
          <pre className="max-h-80 overflow-auto rounded-lg bg-card p-4 font-mono text-xs ring-1 ring-foreground/10">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
