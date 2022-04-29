import { Flex, Grid, GridItem, Spinner } from "@chakra-ui/react";
import React from "react";
import { Panel, PanelBody, PanelTitle } from "../../../components/Panel";
import { useMetadata } from "../../../lib/hooks/use-metadata";

const PageTableContainer = ({ filters }) => {
  const { data, isLoading, isError } = useMetadata("device", filters); // TODO: Needs to change

  if (isLoading) {
    return <Spinner />;
  }

  if (isError) {
    return <div>Whoops.. Something bad happened!</div>;
  }

  if (data.length === 0) {
    return <Flex>No Data Available</Flex>;
  }

  const heading = (
    <>
      <GridItem colSpan={2}>Name</GridItem>
      <GridItem textAlign="right">Views</GridItem>
      <GridItem textAlign="right">Unique</GridItem>
    </>
  );

  const rows = data.map((row, index) => (
    <React.Fragment key={index}>
      <GridItem colSpan={2}>{row.element}</GridItem>
      <GridItem textAlign="right">{row.views}</GridItem>
      <GridItem textAlign="right">{row.unique}</GridItem>
    </React.Fragment>
  ));

  return (
    <Grid templateColumns="repeat(4, 1fr)" gap={2}>
      {heading}
      {rows}
    </Grid>
  );
};

export function PageTable({ filters }) {
  return (
    <Panel flex={1}>
      <PanelTitle>Page</PanelTitle>
      <PanelBody>
        <PageTableContainer filters={filters} />
      </PanelBody>
    </Panel>
  );
}
