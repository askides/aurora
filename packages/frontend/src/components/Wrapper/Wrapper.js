import { Flex, Heading, HStack, Spinner } from "@chakra-ui/react";

const Wrapper = ({ children }) => {
  return (
    <Flex width="100%" direction="column" gap={6}>
      {children}
    </Flex>
  );
};

const WrapperHeader = ({ children }) => {
  return (
    <Flex direction="row" justifyContent="space-between">
      {children}
    </Flex>
  );
};

const WrapperTitle = ({ children }) => {
  return <Heading as="h1">{children}</Heading>;
};

const WrapperActions = ({ children }) => {
  return <HStack spacing={4}>{children}</HStack>;
};

const WrapperContent = ({ children, isLoading = false }) => {
  if (isLoading) {
    return (
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="blue.500"
        size="xl"
      />
    );
  }

  return children;
};

// Assignements
Wrapper.Header = WrapperHeader;
Wrapper.Title = WrapperTitle;
Wrapper.Actions = WrapperActions;
Wrapper.Content = WrapperContent;

export { Wrapper };
