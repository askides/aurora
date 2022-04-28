import { Flex, Spinner } from "@chakra-ui/react";
import { Panel, PanelBody, PanelTitle } from "../../../components/Panel";
import { useMetadata } from "../../../lib/hooks/use-metadata";

// TODO: Fix Grid Components and any
const BrowserTableContainer = ({ filters }: any) => {
  const { data, isLoading, isError } = useMetadata("browser", filters);

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

  // TODO: Fix this any
  const rows = data.map((row: any) => (
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

// TODO: Fix this any
export function BrowserTable({ filters }: any) {
  return (
    <Panel flex={1}>
      <PanelTitle>Browser</PanelTitle>
      <PanelBody>
        <BrowserTableContainer filters={filters} />
      </PanelBody>
    </Panel>
  );
}
