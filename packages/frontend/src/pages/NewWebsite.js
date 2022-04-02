import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { ApiClient } from "../lib/api-client";
import { useForm } from "../lib/hooks/use-form";

export function NewWebsiteForm() {
  const toast = useToast();
  const { getFormProps, onSubmit, isSubmitting } = useForm();

  const handleSubmit = async (data) => {
    console.log("Submitted Data", data);

    try {
      await ApiClient.post("/setup", data);

      toast({
        title: "Account created.",
        description: "We've created your account for you.",
        status: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        status: "error",
      });
    }
  };

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

      <Button width="100%" type="submit" isLoading={isSubmitting}>
        Create Website!
      </Button>
    </VStack>
  );
}

export function NewWebsite() {
  return (
    <Flex width="100%" direction="column" gap={6}>
      <Flex direction="column" justifyContent="space-between">
        <Heading as="h1">Create Website</Heading>
      </Flex>

      <Box boxShadow="xs" p="6" rounded="md" bg="white">
        <NewWebsiteForm />
      </Box>
    </Flex>
  );
}
