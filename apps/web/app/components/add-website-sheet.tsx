import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";

/**
 * Adding a site is three fields, which never justified a whole page.
 *
 * It posts to the /websites/new action with a fetcher rather than navigating,
 * so the panel can show its own validation error without the surrounding page
 * changing. The action redirects on success, which React Router follows and
 * which unmounts the panel — no manual close needed for the happy path.
 */
export function AddWebsiteSheet({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher<{ error?: string }>();

  const isSubmitting = fetcher.state !== "idle";
  const error = fetcher.data?.error;
  const wasSubmitting = useRef(false);

  /**
   * A successful create answers with a redirect, so there is nothing in
   * `fetcher.data` to react to — the only signal is the submission finishing
   * without an error. A rejected one leaves the panel open so the message is
   * readable.
   */
  useEffect(() => {
    if (fetcher.state === "submitting") {
      wasSubmitting.current = true;

      return;
    }

    if (fetcher.state === "idle" && wasSubmitting.current) {
      wasSubmitting.current = false;

      if (!fetcher.data?.error) {
        setOpen(false);
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />

      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add website</SheetTitle>
          <SheetDescription>
            Aurora starts collecting as soon as the snippet is live.
          </SheetDescription>
        </SheetHeader>

        <fetcher.Form
          method="post"
          action="/websites/new"
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4"
        >
          <Field>
            <FieldLabel htmlFor="add-website-name">Website name</FieldLabel>
            <Input
              id="add-website-name"
              name="name"
              placeholder="Docs"
              autoComplete="off"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="add-website-url">Website URL</FieldLabel>
            <Input
              id="add-website-url"
              name="url"
              placeholder="example.com"
              autoComplete="off"
              required
            />
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="add-website-public">
                Share statistics
              </FieldLabel>
              <FieldDescription>
                Publishes a read-only copy of this dashboard at a public link.
                Turn it off at any time.
              </FieldDescription>
            </FieldContent>
            <Switch id="add-website-public" name="is_public" value="on" />
          </Field>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <SheetFooter className="mt-auto px-0">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Add website
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </SheetFooter>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
