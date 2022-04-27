import { Flex, SystemProps } from "@chakra-ui/react";
import * as React from "react";

interface PanelProps extends SystemProps {
  children: React.ReactNode;
  direction?: SystemProps["flexDirection"];
}

const Panel = ({ direction = "column", children, ...rest }: PanelProps) => {
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

export { Panel };
