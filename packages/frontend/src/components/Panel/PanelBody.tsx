import { Box } from "@chakra-ui/react";
import * as React from "react";

interface PanelBodyProps {
  children: React.ReactNode;
}

const PanelBody = ({ children }: PanelBodyProps) => {
  return <Box>{children}</Box>;
};

export { PanelBody };
