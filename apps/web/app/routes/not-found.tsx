import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export const meta = () => [{ title: "Not found — Aurora" }];

export async function loader() {
  throw new Response("Not found", { status: 404 });
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5">
      <h1 className="text-2xl font-semibold">404 - Page not found!</h1>

      <Button render={<Link to="/" />}>Back to a safe place!</Button>
    </main>
  );
}
