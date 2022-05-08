import { Heading, Text } from "@chakra-ui/react";
import { Panel } from "../Panel";

interface StatProps {
  label: string;
  value: string;
}

const Stat = ({ label, value }: StatProps) => {
  return (
    <Panel flex={1} gap={3}>
      <Heading as="h3" size="md">
        {label}
      </Heading>

      <Text fontSize="3xl" lineHeight="1">
        {value}
      </Text>
    </Panel>
  );
};

export { Stat };
