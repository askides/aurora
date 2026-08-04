import { useEffect } from "react";
import { Form, useNavigation } from "react-router";
import { TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Page,
  PageDescription,
  PageHeader,
  PageHeading,
  PageTitle,
} from "~/components/page-header";
import { Alert, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { updateUser } from "~/lib/queries.server";
import { requireUser } from "~/lib/session.server";
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
  return { user: await requireUser(request) };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();

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

  return { ok: true };
}

export default function Account({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { user } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData && "ok" in actionData) {
      toast.success("Account updated");
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

      {/* One form, two cards: the action reads every field in a single pass. */}
      <Form method="post" className="flex flex-col gap-4">
        {actionData && "error" in actionData && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>{actionData.error}</AlertTitle>
          </Alert>
        )}

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
                  Leave blank to keep your current password. Minimum 8
                  characters.
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
    </Page>
  );
}
