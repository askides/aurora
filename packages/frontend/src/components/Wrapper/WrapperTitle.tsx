import { Heading } from "@chakra-ui/react";

interface WrapperTitleProps {
  children: string;
}

const WrapperTitle = ({ children }: WrapperTitleProps) => {
  return <Heading as="h1">{children}</Heading>;
};

export { WrapperTitle };
