import { Box, Flex, Heading } from "@chakra-ui/react";
import * as React from "react";

interface Props {
  direction?: "row" | "column";
}

type TitleComponent = React.FC;
type BodyComponent = React.FC;
type PanelComponent = React.FC<Props> & { Title: TitleComponent } & {
  Body: BodyComponent;
};

const Panel: PanelComponent = ({ direction = "column", children, ...rest }) => {
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

const PanelTitle: React.FC = ({ children }) => {
  return (
    <Heading as="h3" size="sm">
      {children}
    </Heading>
  );
};

const PanelBody: React.FC = (props) => {
  return <Box {...props} />;
};

// Assignements
Panel.Body = PanelBody;
Panel.Title = PanelTitle;

export { Panel };
