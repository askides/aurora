import { Flex, SystemProps } from "@chakra-ui/react";
import * as React from "react";

interface PanelProps extends SystemProps {
  children: React.ReactNode;
  direction?: SystemProps["flexDirection"];
}

const Panel = ({ children, ...props }: PanelProps) => {
  const { direction = "column", ...rest } = props;

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
