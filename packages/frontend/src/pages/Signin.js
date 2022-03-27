import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  VStack,
} from "@chakra-ui/react";
import * as React from "react";
import { useForm } from "../lib/hooks/use-form";

export function SigninForm() {
  const { getFormProps, onSubmit, isSubmitting } = useForm();

  const handleSubmit = async (data) => {
    await new Promise((r) => setTimeout(r, 2000));
    console.log("Submitted Data", data);
  };

  return (
    <VStack
      as="form"
      spacing={5}
      onSubmit={onSubmit(handleSubmit)}
      {...getFormProps()}
    >
      <FormControl>
        <FormLabel htmlFor="email">Email address</FormLabel>
        <Input name="email" id="email" type="email" />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="password">Password</FormLabel>
        <Input name="password" id="password" type="password" />
      </FormControl>

      <Button width="100%" type="submit" isLoading={isSubmitting}>
        Sign In!
      </Button>
    </VStack>
  );
}

export function Signin() {
  return (
    <Flex minHeight="100vh" justifyContent="center" alignItems="center">
      <Flex maxWidth="xl" direction="column" flex={1} gap={5}>
        <Heading as="h1">Sign In</Heading>
        <SigninForm onSubmit={(data) => console.log(data)} />
      </Flex>
    </Flex>
  );
}
