import { Flex, Spinner } from "@chakra-ui/react";
import * as React from "react";
import { Stat } from "../../../components/Stat";
import { useStatistics } from "../../../lib/hooks/use-statistics";

export function Stats({ filters }) {
  const { data, isLoading, isError } = useStatistics(filters);

  if (isLoading || isError) {
    return (
      <Flex gap={5}>
        <Stat label="Page Views" value={<Spinner />} />
        <Stat label="Unique Visitors" value={<Spinner />} />
        <Stat label="Bounce Rate" value={<Spinner />} />
        <Stat label="Average Visit Time" value={<Spinner />} />
      </Flex>
    );
  }

  return (
    <Flex gap={5}>
      <Stat label="Page Views" value={data.visits} />
      <Stat label="Unique Visitors" value={data.uniqueVisits} />
      <Stat label="Bounce Rate" value={data.bounces} />
      <Stat
        label="Average Visit Time"
        value={Math.ceil(data.avgDuration / 1000) + "s"}
      />
    </Flex>
  );
}
