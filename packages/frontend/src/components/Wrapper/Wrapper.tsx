import { Flex } from "@chakra-ui/react";
import * as React from "react";

interface WrapperProps {
  children: React.ReactNode;
}

const Wrapper = ({ children }: WrapperProps) => {
  return (
    <Flex width="100%" direction="column" gap={6} flex={1}>
      {children}
    </Flex>
  );
};

export { Wrapper };
