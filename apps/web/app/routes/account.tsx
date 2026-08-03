import { Form, useNavigation } from "react-router";
import { Page, PageHeader, PageTitle } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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

  return (
    <Page>
      <PageHeader>
        <PageTitle>Account</PageTitle>
      </PageHeader>

      <Card>
        <CardContent>
          <Form method="post" className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="firstname">Firstname</Label>
              <Input
                id="firstname"
                name="firstname"
                defaultValue={user.firstname}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastname">Lastname</Label>
              <Input
                id="lastname"
                name="lastname"
                defaultValue={user.lastname}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
              />
              <p className="text-muted-foreground text-sm">
                Leave blank to keep your current password. Minimum 8 characters.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Repeat New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
              />
            </div>

            {actionData && "error" in actionData && (
              <p role="alert" className="text-destructive text-sm">
                {actionData.error}
              </p>
            )}

            {actionData && "ok" in actionData && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Account updated!
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Update Informations!
            </Button>
          </Form>
        </CardContent>
      </Card>
    </Page>
  );
}
