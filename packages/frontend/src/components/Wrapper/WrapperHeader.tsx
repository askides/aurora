import { Flex } from "@chakra-ui/react";
import * as React from "react";

interface WrapperHeaderProps {
  children: React.ReactNode;
}

const WrapperHeader = ({ children }: WrapperHeaderProps) => {
  return (
    <Flex direction="row" justifyContent="space-between">
      {children}
    </Flex>
  );
};

export { WrapperHeader };
