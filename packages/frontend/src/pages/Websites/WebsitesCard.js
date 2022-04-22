import { Badge, Button, Flex, Heading } from "@chakra-ui/react";
import * as React from "react";
import { Link } from "react-router-dom";
import { Panel } from "../../components/Panel";

export function WebsitesCard({ id, name, is_public }) {
  const colorScheme = is_public ? "green" : "red";
  const label = is_public ? "Public" : "Private";

  return (
    <Panel>
      <Flex alignItems="center" justifyContent="space-between">
        <Heading as="h3" size="md">
          {name}
        </Heading>
        <Badge colorScheme={colorScheme}>{label}</Badge>
      </Flex>
      <Flex gap={5}>
        <Button flex={1} as={Link} to={`/websites/${id}/edit`}>
          View Details
        </Button>
        <Button
          flex={1}
          as={Link}
          colorScheme="blue"
          to={`/websites/${id}/analytics`}
        >
          View Analytics
        </Button>
      </Flex>
    </Panel>
  );
}
