import { Grid, GridItem, Text } from "@chakra-ui/react";
import { Panel } from "../../components/Panel";
import { IWebsite } from "../../lib/models";
import { WebsitesCard } from "./WebsitesCard";

interface WebsitesListProps {
  data: IWebsite[];
}

const WebsitesList = ({ data }: WebsitesListProps) => {
  if (data.length === 0) {
    return (
      <Panel direction="row" alignItems="center" justifyContent="space-between">
        <Text>Here is absolute emptiness..</Text>
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
