import { Center, Flex, Heading, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { SignInForm } from "./SignInForm";

const SignIn = () => {
  return (
    <Center height="100vh">
      <Flex direction="column" alignItems="center" gap={8} width="md">
        <Heading as="h1" size="xl">
          Sign In
        </Heading>
        <SignInForm />

        <Flex gap={1}>
          <Text fontSize="base" color="gray.500">
            First time here?
          </Text>
          <Text color="blue.500" fontWeight={500} as={Link} to="/setup">
            Create the first user!
          </Text>
        </Flex>
      </Flex>
    </Center>
  );
};

export { SignIn };
