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
import { useForm } from "../../lib/hooks/use-form";

export function WebsitesForm({ isNew, onSubmit: handleSubmit, values = {} }) {
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
            <Code>https://useaurora.app/apps/29fh2ondkd</Code>
          </FormControl>

          <FormControl>
            <FormLabel>How to Connect Your Website</FormLabel>
            <Code>Code to paste here</Code>
            <FormHelperText>
              Copy this line and paste it in your website&apos;s HEAD section:
            </FormHelperText>
          </FormControl>
        </>
      )}

      <Button width="100%" type="submit" isLoading={isSubmitting}>
        Create Website!
      </Button>
    </VStack>
  );
}
