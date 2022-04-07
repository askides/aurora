import {
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Image,
  Input,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import * as React from "react";
import { ApiClient } from "../lib/api-client";
import { useForm } from "../lib/hooks/use-form";

export function SetupForm() {
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
        <FormLabel htmlFor="firstname">First Name</FormLabel>
        <Input name="firstname" id="firstname" type="text" />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="lastname">Last Name</FormLabel>
        <Input name="lastname" id="lastname" type="text" />
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="email">Email address</FormLabel>
        <Input name="email" id="email" type="email" />
        <FormHelperText>It will be used as username.</FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="password">Password</FormLabel>
        <Input name="password" id="password" type="password" />
        <FormHelperText>Minimum 8 Characters</FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel htmlFor="confirmPassword">Repeat Password</FormLabel>
        <Input name="confirmPassword" id="confirmPassword" type="password" />
      </FormControl>

      <Button width="100%" type="submit" isLoading={isSubmitting}>
        Start using Aurora!
      </Button>
    </VStack>
  );
}

export function Setup() {
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
          <Heading as="h1">Welcome</Heading>
          <Text fontSize="xl">
            You are about to setup your first Aurora account. Please fill the
            form to continue. You will be able to change these informations
            later, so don't worry.
          </Text>
        </Flex>
      </Flex>
      <Flex direction="column" flex={1} gap={5} padding={10}>
        <SetupForm onSubmit={(data) => console.log(data)} />
      </Flex>
    </Flex>
  );
}
