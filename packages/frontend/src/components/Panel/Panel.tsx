import { Flex, forwardRef, SystemProps } from "@chakra-ui/react";
import * as React from "react";

interface PanelProps extends SystemProps {
  children: React.ReactNode;
  direction?: SystemProps["flexDirection"];
}

const Panel = forwardRef<PanelProps, "div">(({ children, ...props }, ref) => {
  const { direction = "column", ...rest } = props;

  return (
    <Flex
      direction={direction}
      boxShadow="xs"
      p="6"
      rounded="md"
      bg="white"
      gap={5}
      ref={ref}
      {...rest}
    >
      {children}
    </Flex>
  );
});

export { Panel };
