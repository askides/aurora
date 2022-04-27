import { Heading } from "@chakra-ui/react";

interface PanelTitleProps {
  children: string;
}

const PanelTitle = ({ children }: PanelTitleProps) => {
  return (
    <Heading as="h3" size="sm">
      {children}
    </Heading>
  );
};

export { PanelTitle };
