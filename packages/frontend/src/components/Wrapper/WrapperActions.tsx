import { HStack } from "@chakra-ui/react";
import * as React from "react";

interface WrapperActionsProps {
  children: React.ReactNode;
}

const WrapperActions = ({ children }: WrapperActionsProps) => {
  return <HStack spacing={4}>{children}</HStack>;
};

export { WrapperActions };
