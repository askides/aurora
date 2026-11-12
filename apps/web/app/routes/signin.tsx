import { ArrowRightIcon, CircleAlertIcon } from "lucide-react";
import { Form, Link, data, redirect, useNavigation } from "react-router";
import { AuthAside, AuthHeading, AuthLayout } from "~/shell/auth-layout";
import { Alert, AlertTitle } from "~/shared/ui/alert";
import { Button } from "~/shared/ui/button";
import { Field, FieldGroup, FieldLabel } from "~/shared/ui/field";
import { Input } from "~/shared/ui/input";
import { Spinner } from "~/shared/ui/spinner";
import { SsoSignIn } from "~/modules/auth/components/sso-button";
import { authConfig } from "~/modules/auth/config.server";
import { verify } from "~/modules/auth/hash.server";
import { getUserByEmail } from "~/modules/auth/queries.server";
import {
  consumeFlashError,
  createUserSession,
  getCurrentUser,
  safeRedirect,
} from "~/modules/auth/session.server";
import { z } from "zod";
import type { Route } from "./+types/signin";

export const meta = () => [{ title: "Sign in — Aurora" }];

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function loader({ request }: Route.LoaderArgs) {
  if (await getCurrentUser(request)) {
    return redirect("/");
  }

  // An SSO attempt that failed comes back here with its reason flashed.
  const { error, headers } = await consumeFlashError(request);

  return data(
    {
      // Only relative paths, so ?redirectTo can't bounce to another origin.
      redirectTo: safeRedirect(
        new URL(request.url).searchParams.get("redirectTo")
      ),
      error,
      sso: authConfig.oidc && { providerName: authConfig.oidc.providerName },
      passwordSignup: authConfig.passwordSignup,
    },
    { headers }
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Lowercased to match what /signup stores: Postgres compares text exactly, so
  // an address typed with different capitalisation than it was registered with
  // would otherwise find no row and read as a wrong password.
  const user = await getUserByEmail(parsed.data.email.trim().toLowerCase());

  // Same message either way, so the response can't be used to probe for emails.
  // An account created through SSO has no password, and nothing matches it.
  if (!user?.password || !verify(parsed.data.password, user.password)) {
    return { error: "Invalid email or password." };
  }

  // Only allow relative paths, so ?redirectTo can't bounce to another origin.
  return createUserSession(user.id, safeRedirect(formData.get("redirectTo")));
}

export default function SignIn({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.formAction === "/signin";
  const error = actionData?.error ?? loaderData.error;

  return (
    <AuthLayout
      aside={
        <AuthAside
          title="Measure everything. Track no one."
          description="Aurora counts your traffic without cookies, fingerprints, or a third party in the middle — and keeps every event in a database only you can reach."
        />
      }
    >
      <div className="flex flex-col gap-7">
        <AuthHeading
          title="Sign in"
          description="Welcome back. Your instance, your data."
        />

        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {loaderData.sso && (
          <SsoSignIn
            providerName={loaderData.sso.providerName}
            redirectTo={loaderData.redirectTo}
          />
        )}

        <Form method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={loaderData.redirectTo}
          />

          <FieldGroup>
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
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
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
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRightIcon className="transition-transform group-hover/button:translate-x-0.5" />
                </>
              )}
            </Button>
          </FieldGroup>
        </Form>

        {loaderData.passwordSignup && (
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Create one
            </Link>
            .
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
