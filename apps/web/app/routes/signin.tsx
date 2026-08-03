import { Form, Link, redirect, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { verify } from "~/lib/hash.server";
import { countUsers, getUserByEmail } from "~/lib/queries.server";
import { createUserSession, getCurrentUser } from "~/lib/session.server";
import { signInSchema } from "~/lib/validation";
import type { Route } from "./+types/signin";

export const meta = () => [{ title: "Sign in — Aurora" }];

export async function loader({ request }: Route.LoaderArgs) {
  if (await getCurrentUser(request)) {
    return redirect("/");
  }

  const redirectTo = new URL(request.url).searchParams.get("redirectTo") ?? "/";

  return {
    // Surfaces the "create the first user" link only when it will actually work.
    needsSetup: (await countUsers()) === 0,
    // Only relative paths, so ?redirectTo can't bounce to another origin.
    redirectTo: redirectTo.startsWith("/") ? redirectTo : "/",
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const redirectTo = String(formData.get("redirectTo") || "/");

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await getUserByEmail(parsed.data.email);

  // Same message either way, so the response can't be used to probe for emails.
  if (!user || !verify(parsed.data.password, user.password)) {
    return { error: "Invalid email or password." };
  }

  // Only allow relative paths, so ?redirectTo can't bounce to another origin.
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  return createUserSession(user.id, safeRedirect);
}

export default function SignIn({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.formAction === "/signin";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <h1 className="text-3xl font-semibold tracking-tight">Sign In</h1>

        <Card className="w-full">
          <CardContent>
            <Form method="post" className="flex flex-col gap-5">
              <input
                type="hidden"
                name="redirectTo"
                value={loaderData.redirectTo}
              />

              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              {actionData?.error && (
                <p role="alert" className="text-destructive text-sm">
                  {actionData.error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign In!"}
              </Button>
            </Form>
          </CardContent>
        </Card>

        {loaderData.needsSetup && (
          <p className="text-muted-foreground text-sm">
            First time here?{" "}
            <Link to="/setup" className="text-primary font-medium">
              Create the first user!
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
