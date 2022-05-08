import { Flex, useMediaQuery } from "@chakra-ui/react";
import * as React from "react";

interface WrapperHeaderProps {
  children: React.ReactNode;
}

const WrapperHeader = ({ children }: WrapperHeaderProps) => {
  const [isNotMobile] = useMediaQuery("(min-width: 768px)");

  return (
    <Flex
      gap={3}
      direction={isNotMobile ? "row" : "column"}
      justifyContent="space-between"
    >
      {children}
    </Flex>
  );
};

export { WrapperHeader };
