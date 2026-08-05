import { CircleAlertIcon } from "lucide-react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { AuthAside, AuthHeading, AuthLayout } from "~/shell/auth-layout";
import { Alert, AlertTitle } from "~/shared/ui/alert";
import { Button } from "~/shared/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/shared/ui/field";
import { Input } from "~/shared/ui/input";
import { Spinner } from "~/shared/ui/spinner";
import { createUser, getUserByEmail } from "~/modules/auth/queries.server";
import {
  createUserSession,
  getCurrentUser,
} from "~/modules/auth/session.server";
import { isUniqueViolation } from "~/shared/lib/pg-errors.server";
import { z } from "zod";
import type { Route } from "./+types/signup";

export const meta = () => [{ title: "Sign up — Aurora" }];

/**
 * Registration is open. This replaced /setup, which was gated to the first
 * account on the instance: anyone who can reach the sign-in page can now create
 * one, and there is nothing else in front of it — no email verification, no
 * invite, no rate limit on this route. A deployment that does not want that has
 * to put something in front of it.
 */
export const signupSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  /**
   * Lowercased here, so the address that reaches the unique index is the one
   * sign-in will look up. Postgres compares text exactly: without this,
   * `Me@Example.com` and `me@example.com` are two accounts the constraint is
   * happy to hold, and the second person to type their address the other way
   * cannot sign in to the account they just made. `/signin` lowercases its
   * lookup for the same reason.
   */
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function loader({ request }: Route.LoaderArgs) {
  if (await getCurrentUser(request)) {
    return redirect("/");
  }

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  if (password !== String(formData.get("confirmPassword") ?? "")) {
    return { error: "Passwords do not match." };
  }

  const parsed = signupSchema.safeParse({
    firstname: formData.get("firstname"),
    lastname: formData.get("lastname"),
    email: formData.get("email"),
    password,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Read first for the readable message, then catch the constraint anyway: two
  // requests can both pass this check before either inserts, and only the
  // unique index sees the second one.
  if (await getUserByEmail(parsed.data.email)) {
    return { error: "An account with that email already exists." };
  }

  try {
    const user = await createUser(parsed.data);

    return createUserSession(user.id, "/");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "An account with that email already exists." };
    }

    throw error;
  }
}

export default function SignUp({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.formAction === "/signup";

  return (
    <AuthLayout
      className="max-w-md"
      aside={
        <AuthAside
          title="Measure everything. Track no one."
          description="Create an account and add the sites you want to measure. Every event stays in this instance's own database."
        />
      }
    >
      <div className="flex flex-col gap-7">
        <AuthHeading
          title="Create your account"
          description="No card, no third party in the middle."
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

            <FieldDescription className="text-center text-xs">
              Already have an account?{" "}
              <Link to="/signin" className="text-foreground hover:underline">
                Sign in
              </Link>
            </FieldDescription>
          </FieldGroup>
        </Form>
      </div>
    </AuthLayout>
  );
}
