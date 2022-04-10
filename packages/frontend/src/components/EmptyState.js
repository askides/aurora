import { Flex, Heading, Text, VStack } from "@chakra-ui/react";

export function EmptyState({ header, description, action }) {
  return (
    <Flex
      boxShadow="xs"
      py="20"
      rounded="md"
      bg="white"
      alignItems="center"
      justifyContent="center"
      direction="column"
    >
      <VStack spacing={8}>
        <VStack spacing={2}>
          <Heading as="h2" size="xl">
            {header}
          </Heading>
          <Text>{description}</Text>
        </VStack>
        {action}
      </VStack>
    </Flex>
  );
}
