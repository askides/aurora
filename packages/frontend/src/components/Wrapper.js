import { Flex, Heading, HStack, Spinner } from "@chakra-ui/react";

export function Wrapper({ children }) {
  return (
    <Flex width="100%" direction="column" gap={6}>
      {children}
    </Flex>
  );
}

export function WrapperHeader({ children }) {
  return (
    <Flex direction="row" justifyContent="space-between">
      {children}
    </Flex>
  );
}

export function WrapperTitle({ children }) {
  return <Heading as="h1">{children}</Heading>;
}

export function WrapperActions({ children }) {
  return <HStack spacing={4}>{children}</HStack>;
}

export function WrapperContent({ children, isLoading = false }) {
  if (isLoading) {
    return <Spinner size="xl" />;
  }

  return children;
}
