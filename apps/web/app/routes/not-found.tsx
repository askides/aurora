import { Link } from "react-router";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";

export const meta = () => [{ title: "Not found — Aurora" }];

export async function loader() {
  throw new Response("Not found", { status: 404 });
}

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-sidebar p-6">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <Logo className="size-6" />
          <span className="text-eyebrow text-muted-foreground">404</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This page doesn&apos;t exist, or it moved somewhere else.
          </p>
        </div>

        <div>
          <Button render={<Link to="/" />}>Back to websites</Button>
        </div>
      </div>
    </main>
  );
}
