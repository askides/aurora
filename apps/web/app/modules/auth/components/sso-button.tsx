import { KeyRoundIcon } from "lucide-react";
import { Form } from "react-router";
import { Button } from "~/shared/ui/button";
import { FieldSeparator } from "~/shared/ui/field";

/**
 * "Continue with <provider>", and the divider that sets it apart from the
 * password form under it.
 *
 * `reloadDocument`, because the answer is a redirect to another origin: a
 * document POST lets the browser follow it, and keeps the flow cookie on the
 * same response as the navigation that needs it.
 */
export function SsoSignIn({
  providerName,
  redirectTo = "/",
}: {
  providerName: string;
  redirectTo?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Form method="post" action="/auth/oidc" reloadDocument>
        <input type="hidden" name="intent" value="signin" />
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <Button type="submit" variant="outline" size="lg" className="w-full">
          <KeyRoundIcon />
          Continue with {providerName}
        </Button>
      </Form>

      <FieldSeparator>or</FieldSeparator>
    </div>
  );
}
