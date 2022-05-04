import { Box } from "@chakra-ui/react";
import * as React from "react";

interface WrapperContentProps {
  children: React.ReactNode;
}

const WrapperContent = ({ children }: WrapperContentProps) => {
  return <Box>{children}</Box>;
};

export { WrapperContent };
