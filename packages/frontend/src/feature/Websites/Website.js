import { Badge, Button, Flex } from "@chakra-ui/react";
import * as React from "react";
import { Link } from "react-router-dom";
import { Panel } from "../../components/Panel";

export function Website({ id, name, is_public }) {
  const colorScheme = is_public ? "green" : "red";
  const label = is_public ? "Public" : "Private";

  return (
    <Panel>
      <Panel.Title>{name}</Panel.Title>
      <Panel.Body>
        <Badge colorScheme={colorScheme}>{label}</Badge>
        <Flex gap={5} alignItems="stretch">
          <Button as={Link} to={`/websites/${id}/edit`}>
            View Details
          </Button>
          <Button as={Link} colorScheme="blue" to={`/websites/${id}/dashboard`}>
            View Analytics
          </Button>
        </Flex>
      </Panel.Body>
    </Panel>
  );
}
