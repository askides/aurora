import {
  Badge,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
} from "@chakra-ui/react";
import * as React from "react";
import { Link } from "react-router-dom";

export function Website({ id, name, is_public }) {
  const WebsiteBadge = ({ status }) => {
    const colorScheme = status ? "green" : "red";
    const label = status ? "Public" : "Private";

    return <Badge colorScheme={colorScheme}>{label}</Badge>;
  };

  return (
    <Flex
      direction="column"
      backgroundColor="white"
      boxShadow="sm"
      padding={5}
      borderRadius={3}
      gap={5}
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading as="h3" size="md">
          {name}
        </Heading>
        <WebsiteBadge status={is_public} />
      </Flex>

      <HStack spacing={5} justify="space-between">
        <Button flex="1" as={Link} to={`/websites/${id}/edit`}>
          View Details
        </Button>
        <Button flex="1" colorScheme="blue">
          View Analytics
        </Button>
      </HStack>
    </Flex>
  );
}

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
