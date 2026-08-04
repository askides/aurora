import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { CopyIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertTitle } from "~/shared/ui/alert";
import { Button } from "~/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/shared/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "~/shared/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/shared/ui/input-group";
import { Input } from "~/shared/ui/input";
import { Spinner } from "~/shared/ui/spinner";
import { Switch } from "~/shared/ui/switch";
import { z } from "zod";

/**
 * Lives with the form it validates — the create and edit routes both submit
 * these exact fields, so keeping one schema here avoids the two drifting.
 */
export const websiteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().min(1, "URL is required"),
  is_public: z.boolean(),
});

export type WebsiteFormValues = {
  name?: string;
  url?: string;
  is_public?: boolean;
};

// Stable reference so the default doesn't change identity on every render.
const NO_VALUES: WebsiteFormValues = {};

function copyToClipboard(text: string, message: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(message),
    () => toast.error("Clipboard is blocked. Select the text and copy it.")
  );
}

export function WebsiteForm({
  isNew = false,
  values = NO_VALUES,
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
  // Mirrors the uncontrolled switch so the share link appears the moment it is
  // turned on, without waiting for a save round-trip.
  const [isPublic, setIsPublic] = useState(values.is_public ?? false);

  return (
    <Form method="post" className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Website name</FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={values.name ?? ""}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="url">Website URL</FieldLabel>
              <Input
                id="url"
                name="url"
                defaultValue={values.url ?? ""}
                placeholder="example.com"
                required
              />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="is_public">Share statistics</FieldLabel>
                <FieldDescription>
                  Publishes a read-only copy of this dashboard at a public link.
                  Turn it off at any time.
                </FieldDescription>
              </FieldContent>
              <Switch
                id="is_public"
                name="is_public"
                value="on"
                defaultChecked={values.is_public ?? false}
                onCheckedChange={setIsPublic}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {!isNew && (
        <Card>
          <CardHeader>
            <CardTitle>Install</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldTitle>Tracking snippet</FieldTitle>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 pr-11 font-mono text-xs leading-6">
                    {snippet}
                  </pre>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Copy snippet"
                    className="absolute top-1 right-1"
                    onClick={() =>
                      copyToClipboard(snippet ?? "", "Snippet copied")
                    }
                  >
                    <CopyIcon />
                  </Button>
                </div>
                <FieldDescription>
                  Paste this in the &lt;head&gt; of every page you want to
                  track.
                </FieldDescription>
              </Field>

              {isPublic && shareLink && (
                <Field>
                  <FieldTitle>Public link</FieldTitle>
                  <InputGroup>
                    <InputGroupInput
                      readOnly
                      value={shareLink}
                      aria-label="Public link"
                      className="font-mono text-xs"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-xs"
                        aria-label="Copy link"
                        onClick={() =>
                          copyToClipboard(shareLink, "Link copied")
                        }
                      >
                        <CopyIcon />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {isNew ? "Add website" : "Save changes"}
        </Button>
      </div>
    </Form>
  );
}
