import {
  Button,
  Checkbox,
  Code,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
} from "@chakra-ui/react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { useAuroraLinks } from "../../lib/hooks/use-aurora-links";
import { Panel } from "../Panel";

export function WebsitesForm({ isNew, onSubmit, values = {} }) {
  const { id } = useParams();
  const { sharedLink, generatedLink } = useAuroraLinks(id);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({ defaultValues: values });

  return (
    <Panel as="form" spacing={5} onSubmit={handleSubmit(onSubmit)}>
      <FormControl>
        <FormLabel htmlFor="name">Website Name</FormLabel>
        <Input id="name" type="text" {...register("name")} />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="url">Website URL</FormLabel>
        <Input id="url" type="text" {...register("url")} />
      </FormControl>

      <FormControl>
        <Checkbox id="is_public" {...register("is_public")}>
          Share Statistics
        </Checkbox>
        <FormHelperText>
          If you choose to make statistics public, a public URL will be
          available presenting a read-only version of the Aurora Dashboard.
          Don't worry, you can always disable it later!
        </FormHelperText>
      </FormControl>

      {!isNew && (
        <>
          <FormControl>
            <FormLabel htmlFor="url">Link to Share</FormLabel>
            <Code>{sharedLink}</Code>
          </FormControl>

          <FormControl>
            <FormLabel>How to Connect Your Website</FormLabel>
            <Code>{generatedLink}</Code>
            <FormHelperText>
              Copy this line and paste it in your website&apos;s HEAD section:
            </FormHelperText>
          </FormControl>
        </>
      )}

      <Button width="100%" type="submit" isLoading={isSubmitting}>
        {isNew ? "Create" : "Update"} Website!
      </Button>
    </Panel>
  );
}
