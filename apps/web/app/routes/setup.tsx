import { Form, redirect, useNavigation } from "react-router";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { countUsers, createUser } from "~/lib/queries.server";
import { createUserSession } from "~/lib/session.server";
import { setupSchema } from "~/lib/validation";
import type { Route } from "./+types/setup";

export const meta = () => [{ title: "Setup — Aurora" }];

/**
 * Setup is for the first user only. The previous implementation documented that
 * rule but never enforced it server-side, so anyone could POST /setup and create
 * an account on a live instance. Both the loader and the action check now.
 */
export async function loader() {
  if ((await countUsers()) > 0) {
    return redirect("/signin");
  }

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  if ((await countUsers()) > 0) {
    return { error: "Setup has already been completed." };
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  if (password !== String(formData.get("confirmPassword") ?? "")) {
    return { error: "Passwords do not match." };
  }

  const parsed = setupSchema.safeParse({
    firstname: formData.get("firstname"),
    lastname: formData.get("lastname"),
    email: formData.get("email"),
    password,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await createUser(parsed.data);

  return createUserSession(user.id, "/");
}

export default function Setup({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.formAction === "/setup";

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-10 p-6 md:flex-row md:gap-0">
      <div className="flex flex-1 flex-col gap-10 md:p-10">
        <Logo className="h-24 w-24" />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
          <p className="text-muted-foreground text-xl">
            You are about to setup your first Aurora account. Please fill the
            form to continue. You will be able to change these informations
            later, so don&apos;t worry.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col md:p-10">
        <Card>
          <CardContent>
            <Form method="post" className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="firstname">First Name</Label>
                <Input id="firstname" name="firstname" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastname">Last Name</Label>
                <Input id="lastname" name="lastname" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" name="email" type="email" required />
                <p className="text-muted-foreground text-sm">
                  It will be used as username.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                <p className="text-muted-foreground text-sm">
                  Minimum 8 characters
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Repeat Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </div>

              {actionData?.error && (
                <p role="alert" className="text-destructive text-sm">
                  {actionData.error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Start using Aurora!"}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
