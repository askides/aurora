import { CircleAlertIcon } from "lucide-react";
import { Form, redirect, useNavigation } from "react-router";
import {
  AuthAside,
  AuthHeading,
  AuthLayout,
} from "~/components/auth-layout";
import { Alert, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { countUsers, createUser } from "~/lib/queries.server";
import { createUserSession } from "~/lib/session.server";
import { z } from "zod";
import type { Route } from "./+types/setup";

export const meta = () => [{ title: "Setup — Aurora" }];

export const setupSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

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
    <AuthLayout
      className="max-w-md"
      aside={
        <AuthAside
          title="Measure everything. Track no one."
          description="This first account owns the instance. Create it once, then add the sites you want to measure."
        />
      }
    >
      <div className="flex flex-col gap-7">
        <AuthHeading
          title="Set up Aurora"
          description="One account, created once, on the instance you control."
        />

        <Form method="post">
          <FieldGroup>
            {actionData?.error && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>{actionData.error}</AlertTitle>
              </Alert>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="firstname">First name</FieldLabel>
                <Input
                  id="firstname"
                  name="firstname"
                  autoComplete="given-name"
                  className="h-9"
                  autoFocus
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="lastname">Last name</FieldLabel>
                <Input
                  id="lastname"
                  name="lastname"
                  autoComplete="family-name"
                  className="h-9"
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-9"
                required
              />
              <FieldDescription className="text-xs">
                Used as your username.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="h-9"
                required
              />
              <FieldDescription className="text-xs">
                At least 8 characters.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">Repeat password</FieldLabel>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="h-9"
                required
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Creating…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </FieldGroup>
        </Form>
      </div>
    </AuthLayout>
  );
}
