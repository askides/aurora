import { Box, Flex, Heading } from "@chakra-ui/react";

const Panel = ({ children, direction = "column", ...rest }) => {
  return (
    <Flex
      direction={direction}
      boxShadow="xs"
      p="6"
      rounded="md"
      bg="white"
      gap={5}
      {...rest}
    >
      {children}
    </Flex>
  );
};

const PanelTitle = ({ children }) => {
  return (
    <Heading as="h3" size="sm">
      {children}
    </Heading>
  );
};

const PanelBody = (props) => {
  return <Box {...props} />;
};

// Assignements
Panel.Body = PanelBody;
Panel.Title = PanelTitle;

export { Panel };
