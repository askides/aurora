import { Center, Flex, Heading } from "@chakra-ui/react";
import { SignInForm } from "./SignInForm";

export function SignIn() {
  return (
    <Center height="100vh">
      <Flex direction="column" alignItems="center" gap={10} width="md">
        <Heading as="h1" size="xl">
          Please Sign In
        </Heading>
        <SignInForm />
      </Flex>
    </Center>
  );
}
