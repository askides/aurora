import { Heading, Text } from "@chakra-ui/react";
import { Panel } from "../Panel";

interface StatProps {
  label: string;
  value: string;
}

const Stat = ({ label, value }: StatProps) => {
  return (
    <Panel flex={1} gap={2}>
      <Text fontSize="md">{label}</Text>
      <Heading as="h1" size="lg">
        {value}
      </Heading>
    </Panel>
  );
};

export { Stat };
