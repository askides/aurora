import { Button, Grid, GridItem, Text } from "@chakra-ui/react";
import * as React from "react";
import { Link } from "react-router-dom";
import { Panel } from "../../components/Panel";
import { WebsitesCard } from "./WebsitesCard";

const WebsitesList = ({ data = [] }) => {
  if (data.length === 0) {
    return (
      <Panel direction="row" alignItems="center" justifyContent="space-between">
        <Text>Here is absolute emptiness..</Text>
        <Button as={Link} to="/websites/new">
          Create New!
        </Button>
      </Panel>
    );
  }

  const items = data.map((website) => {
    return (
      <GridItem w="100%" key={website.id}>
        <WebsitesCard {...website} />
      </GridItem>
    );
  });

  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={6}>
      {items}
    </Grid>
  );
};

export { WebsitesList };
