import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

export type WebsiteFormValues = {
  name?: string;
  url?: string;
  is_public?: boolean;
};

export function WebsiteForm({
  isNew = false,
  values = {},
  error,
  shareLink,
  snippet,
}: {
  isNew?: boolean;
  values?: WebsiteFormValues;
  error?: string;
  shareLink?: string;
  snippet?: string;
}) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Card>
      <CardContent>
        <Form method="post" className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="name">Website Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={values.name ?? ""}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              name="url"
              defaultValue={values.url ?? ""}
              required
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <Switch
                id="is_public"
                name="is_public"
                value="on"
                defaultChecked={values.is_public ?? false}
              />
              <Label htmlFor="is_public">Share Statistics</Label>
            </div>
            <p className="text-muted-foreground text-sm">
              If you choose to make statistics public, a public URL will be
              available presenting a read-only version of the Aurora Dashboard.
              Don&apos;t worry, you can always disable it later!
            </p>
          </div>

          {!isNew && (
            <>
              <div className="grid gap-2">
                <Label>Link to Share</Label>
                <code className="bg-muted overflow-x-auto rounded-md px-3 py-2 text-sm">
                  {shareLink}
                </code>
              </div>

              <div className="grid gap-2">
                <Label>How to Connect Your Website</Label>
                <code className="bg-muted overflow-x-auto rounded-md px-3 py-2 text-sm whitespace-pre">
                  {snippet}
                </code>
                <p className="text-muted-foreground text-sm">
                  Copy this line and paste it in your website&apos;s HEAD
                  section:
                </p>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isNew ? "Create" : "Update"} Website!
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
}
