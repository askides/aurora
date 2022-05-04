import { Flex, Heading, Image, Text } from "@chakra-ui/react";
import { SetupForm } from "./SetupForm";

const Setup = () => {
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
        <SetupForm />
      </Flex>
    </Flex>
  );
};

export { Setup };
