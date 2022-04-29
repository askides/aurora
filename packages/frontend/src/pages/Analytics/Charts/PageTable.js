import { Divider, Flex, Grid, GridItem, Spinner } from "@chakra-ui/react";
import React from "react";
import { Panel, PanelBody, PanelTitle } from "../../../components/Panel";
import { usePages } from "../../../lib/hooks/use-pages";

const PageTableContainer = ({ filters }) => {
  const { data, isLoading, isError } = usePages(filters);

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

  const divider = (
    <GridItem colSpan={4} py={2}>
      <Divider variant="dashed" />
    </GridItem>
  );

  const rows = data.map((row, index) => (
    <React.Fragment key={index}>
      <GridItem colSpan={2}>{row.element}</GridItem>
      <GridItem textAlign="right">{row.views}</GridItem>
      <GridItem textAlign="right">{row.unique}</GridItem>
    </React.Fragment>
  ));

  return (
    <Grid templateColumns="repeat(4, 1fr)" gap={1}>
      {heading}
      {divider}
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
