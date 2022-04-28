import { Flex, forwardRef, SystemProps } from "@chakra-ui/react";
import * as React from "react";

interface PanelProps extends SystemProps {
  children: React.ReactNode;
  direction?: SystemProps["flexDirection"];
  p?: SystemProps["padding"];
}

const Panel = forwardRef<PanelProps, "div">(({ children, ...props }, ref) => {
  const { direction = "column", p = 6, ...rest } = props;

  return (
    <Flex
      direction={direction}
      p={p}
      boxShadow="xs"
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
