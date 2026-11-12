import { useEffect } from "react";
import { Form, data, useNavigation } from "react-router";
import { KeyRoundIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Page,
  PageDescription,
  PageHeader,
  PageHeading,
  PageTitle,
} from "~/shared/components/page-header";
import { Alert, AlertTitle } from "~/shared/ui/alert";
import { Button } from "~/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/shared/ui/field";
import { Input } from "~/shared/ui/input";
import { Spinner } from "~/shared/ui/spinner";
import { authConfig } from "~/modules/auth/config.server";
import {
  getUserIdentity,
  unlinkIdentity,
  updateUser,
} from "~/modules/auth/queries.server";
import { consumeFlashError, requireUser } from "~/modules/auth/session.server";
import { z } from "zod";
import type { Route } from "./+types/account";

export const meta = () => [{ title: "Account — Aurora" }];

export const accountSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  email: z.email("Enter a valid email address"),
  // Blank means "leave the current password alone".
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
});

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const settings = authConfig.oidc;

  // A connection that failed on the way back from the provider lands here
  // with its reason flashed.
  const { error, headers } = await consumeFlashError(request);

  return data(
    {
      user,
      error,
      sso: settings && {
        providerName: settings.providerName,
        connected: !!(await getUserIdentity(user.id)),
      },
    },
    { headers }
  );
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();

  if (formData.get("intent") === "disconnect-sso") {
    const settings = authConfig.oidc;

    if (!settings) {
      throw new Response("Not found", { status: 404 });
    }

    // Refused in the statement itself when there is no password to fall back
    // on, so an SSO-only account cannot lock itself out.
    if (!(await unlinkIdentity(user.id))) {
      return {
        error: `Set a password before disconnecting ${settings.providerName}, or you will have no way to sign in.`,
      };
    }

    return { ok: true, notice: `${settings.providerName} disconnected` };
  }

  const password = String(formData.get("password") ?? "");

  if (password && password !== String(formData.get("confirmPassword") ?? "")) {
    return { error: "Passwords do not match." };
  }

  const parsed = accountSchema.safeParse({
    firstname: formData.get("firstname"),
    lastname: formData.get("lastname"),
    email: formData.get("email"),
    password,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // An empty password field means "keep the existing one".
  const { password: newPassword, ...rest } = parsed.data;

  await updateUser(user.id, {
    ...rest,
    ...(newPassword ? { password: newPassword } : {}),
  });

  return { ok: true, notice: "Account updated" };
}

export default function Account({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { user, sso } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const error =
    actionData && "error" in actionData ? actionData.error : loaderData.error;

  useEffect(() => {
    if (actionData && "ok" in actionData) {
      toast.success(actionData.notice);
    }
  }, [actionData]);

  return (
    <Page className="max-w-2xl">
      <PageHeader>
        <PageHeading>
          <PageTitle>Account</PageTitle>
          <PageDescription>
            Your sign-in details for this Aurora instance.
          </PageDescription>
        </PageHeading>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {/* One form, two cards: the action reads every field in a single pass. */}
      <Form method="post" className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="firstname">First name</FieldLabel>
                  <Input
                    id="firstname"
                    name="firstname"
                    defaultValue={user.firstname}
                    autoComplete="given-name"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="lastname">Last name</FieldLabel>
                  <Input
                    id="lastname"
                    name="lastname"
                    defaultValue={user.lastname}
                    autoComplete="family-name"
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
                  defaultValue={user.email}
                  autoComplete="email"
                  required
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                />
                <FieldDescription>
                  {user.has_password
                    ? "Leave blank to keep your current password."
                    : "You sign in through single sign-on. Set a password to also sign in with your email."}{" "}
                  Minimum 8 characters.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Repeat new password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Save changes
          </Button>
        </div>
      </Form>

      {/* Its own forms, outside the one above: HTML forms do not nest. */}
      {sso && (
        <Card>
          <CardHeader>
            <CardTitle>Single sign-on</CardTitle>
            <CardDescription>
              {sso.connected
                ? `You can sign in with your ${sso.providerName} account.`
                : `Connect your ${sso.providerName} account to sign in with it.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            {sso.connected ? (
              <Form method="post">
                <input type="hidden" name="intent" value="disconnect-sso" />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSubmitting || !user.has_password}
                >
                  Disconnect {sso.providerName}
                </Button>
              </Form>
            ) : (
              <Form method="post" action="/auth/oidc" reloadDocument>
                <input type="hidden" name="intent" value="link" />
                <Button type="submit" variant="outline">
                  <KeyRoundIcon />
                  Connect {sso.providerName}
                </Button>
              </Form>
            )}

            {sso.connected && !user.has_password && (
              <FieldDescription>
                Set a password above before disconnecting, or you will have no
                way to sign in.
              </FieldDescription>
            )}
          </CardContent>
        </Card>
      )}
    </Page>
  );
}
