import { Flex, Spinner } from "@chakra-ui/react";
import { Panel } from "../../components/Panel";
import { useMetadata } from "../../lib/hooks/use-metadata";

const ReferrerTableContainer = ({ filters }) => {
  const { data, isLoading, isError } = useMetadata("referrer", filters);

  if (isLoading) {
    return <Spinner />;
  }

  if (isError) {
    return <div>Whoops.. Something bad happened!</div>;
  }

  const heading = (
    <Flex gap={5}>
      <Flex flex={1}>Name</Flex>
      <Flex>Views</Flex>
      <Flex>Unique</Flex>
    </Flex>
  );

  const rows = data.map((row) => (
    <Flex>
      <Flex flex={1}>{row.element}</Flex>
      <Flex>{row.views}</Flex>
      <Flex>{row.unique}</Flex>
    </Flex>
  ));

  return (
    <>
      {heading}
      {rows}
    </>
  );
};

export function ReferrerTable({ filters }) {
  return (
    <Panel flex={1}>
      <Panel.Title>Referrer</Panel.Title>
      <Panel.Body>
        <ReferrerTableContainer filters={filters} />
      </Panel.Body>
    </Panel>
  );
}
