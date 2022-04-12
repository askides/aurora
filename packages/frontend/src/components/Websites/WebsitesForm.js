import {
  Button,
  Checkbox,
  Code,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  VStack,
} from "@chakra-ui/react";
import * as React from "react";
import { useParams } from "react-router-dom";
import { useAuroraLinks } from "../../lib/hooks/use-aurora-links";
import { useForm } from "../../lib/hooks/use-form";

export function WebsitesForm({ isNew, onSubmit: handleSubmit, values = {} }) {
  const { id } = useParams();
  const { sharedLink, generatedLink } = useAuroraLinks(id);
  // TODO: Fix checkboxes pre-fill. Maybe use a library?
  const { getFormProps, onSubmit, isSubmitting } = useForm(values);

  return (
    <VStack
      as="form"
      spacing={5}
      onSubmit={onSubmit(handleSubmit)}
      {...getFormProps()}
    >
      <FormControl>
        <FormLabel htmlFor="name">Website Name</FormLabel>
        <Input name="name" id="name" type="text" />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="url">Website URL</FormLabel>
        <Input name="url" id="url" type="text" />
      </FormControl>

      <FormControl>
        <Checkbox name="is_public" id="is_public">
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
    </VStack>
  );
}
