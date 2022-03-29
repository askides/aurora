import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Image,
  Input,
  Text,
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
    <Flex
      maxWidth="7xl"
      marginX="auto"
      minHeight="100vh"
      justifyContent="center"
      alignItems="center"
    >
      <Flex direction="column" flex={1} gap={10} padding={10}>
        <Image src="./aurora_mini_blue.svg" boxSize="100px" alt="Aurora Logo" />
        <Flex direction="column" gap={3}>
          <Heading as="h1">Sign In</Heading>
          <Text fontSize="xl">Use your email and password to sign in.</Text>
        </Flex>
      </Flex>
      <Flex direction="column" flex={1} gap={5} padding={10}>
        <SigninForm onSubmit={(data) => console.log(data)} />
      </Flex>
    </Flex>
  );
}
