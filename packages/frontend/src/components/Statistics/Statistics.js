import { Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import * as React from "react";
import { useStatistics } from "../../lib/hooks/use-statistics";

export function Statistic({ label, value, isLoading, isError }) {
  return (
    <Flex
      flex={1}
      direction="column"
      boxShadow="xs"
      p="6"
      rounded="md"
      bg="white"
      gap={2}
    >
      <Text fontSize="md">{label}</Text>

      {isLoading && <Spinner size="md" />}
      {!isLoading && !isError && (
        <Heading as="h1" size="lg">
          {value}
        </Heading>
      )}
    </Flex>
  );
}

export function Statistics({ filters }) {
  const { data, isLoading, isError } = useStatistics(filters);

  return (
    <Flex gap={5}>
      <Statistic
        label="Page Views"
        value={data?.visits}
        isLoading={isLoading}
      />
      <Statistic
        label="Unique Visitors"
        value={data?.uniqueVisits}
        isLoading={isLoading}
      />
      <Statistic
        label="Bounce Rate"
        value={data?.bounces}
        isLoading={isLoading}
      />
      <Statistic
        label="Average Visit Time"
        value={data?.avgDuration}
        isLoading={isLoading}
      />
    </Flex>
  );
}
