import { SimpleGrid, Spinner } from "@chakra-ui/react";
import { Stat } from "../../../components/Stat";
import { useStatistics } from "../../../lib/hooks/use-statistics";

export function Stats({ filters }) {
  const { data, isLoading, isError } = useStatistics(filters);

  if (isLoading || isError) {
    return (
      <SimpleGrid spacing={5} columns={{ sm: 1, md: 2, lg: 4 }}>
        <Stat label="Page Views" value={<Spinner />} />
        <Stat label="Unique Visitors" value={<Spinner />} />
        <Stat label="Bounces" value={<Spinner />} />
        <Stat label="Average Visit Time" value={<Spinner />} />
      </SimpleGrid>
    );
  }

  const avg = Math.ceil(data.avgDuration / 1000);

  return (
    <SimpleGrid spacing={5} columns={{ sm: 1, md: 2, lg: 4 }}>
      <Stat label="Page Views" value={data.visits} />
      <Stat label="Unique Visitors" value={data.uniqueVisits} />
      <Stat label="Bounces" value={data.bounces} />
      <Stat label="Average Visit Time" value={`${avg}s`} />
    </SimpleGrid>
  );
}
