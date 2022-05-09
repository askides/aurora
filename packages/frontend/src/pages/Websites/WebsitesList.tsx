import {
  Badge,
  Button,
  Flex,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Panel } from "../../components/Panel";
import { Website } from "../../types";

interface WebsitesListProps {
  data: Website[];
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
      <Tr key={website.id}>
        <Td fontWeight={600}>{website.name}</Td>
        <Td>{website.url}</Td>
        <Td>
          <Badge>{website.is_public ? "Public" : "Private"}</Badge>
        </Td>
        <Td isNumeric>
          <Flex gap={2} justifyContent="flex-end">
            <Button size="sm" as={Link} to={`/websites/${website.id}/edit`}>
              View Details
            </Button>
            <Button
              size="sm"
              as={Link}
              colorScheme="blue"
              to={`/websites/${website.id}/analytics`}
            >
              View Analytics
            </Button>
          </Flex>
        </Td>
      </Tr>
    );
  });

  return (
    <Panel p={0}>
      <TableContainer>
        <Table variant="simple" colorScheme="blackAlpha">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Url</Th>
              <Th>Status</Th>
              <Th isNumeric>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>{items}</Tbody>
        </Table>
      </TableContainer>
    </Panel>
  );
};

export { WebsitesList };
