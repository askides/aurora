import { Heading } from "@chakra-ui/react";

interface PanelTitleProps {
  children: string;
}

const PanelTitle = ({ children }: PanelTitleProps) => {
  return (
    <Heading as="h3" size="md">
      {children}
    </Heading>
  );
};

export { PanelTitle };
