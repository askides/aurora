import { Button, Grid, GridItem, Spinner } from "@chakra-ui/react";
import * as React from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { useWebsites } from "../../lib/hooks/use-websites";
import { Website } from "./Website";

const WebsiteListContainer = () => {
  const { data, isLoading, isError } = useWebsites();

  if (isLoading) {
    return <Spinner />;
  }

  if (isError) {
    return <p>Error</p>;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        header="You don't have any item yet."
        description="You can create one by clicking the button below."
        action={
          <Button as={Link} to="/websites/new" size="lg">
            Create First!
          </Button>
        }
      />
    );
  }

  return <WebsitesList data={data} />;
};

export function WebsitesList({ data }) {
  const items = data.map((website) => {
    return (
      <GridItem w="100%" key={website.id}>
        <Website {...website} />
      </GridItem>
    );
  });

  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={6}>
      {items}
    </Grid>
  );
}

export { WebsiteListContainer };
