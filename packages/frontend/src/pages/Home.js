import {
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { Dashboard, Trash } from "tabler-icons-react";
import { useMockWebsites } from "../lib/hooks/mocks/use-mock-websites";

export function Website({ name, is_public }) {
  return (
    <Flex
      direction="column"
      backgroundColor="white"
      boxShadow="sm"
      padding={5}
      borderRadius={3}
    >
      <Heading as="h3" size="lg">
        {name}
      </Heading>
      <p>{is_public ? "Public" : "Private"}</p>

      <HStack spacing={4}>
        <Button flex="1">View Details</Button>
        <IconButton
          aria-label="View Analytics"
          icon={<Dashboard />}
          backgroundColor="blue.500"
        />
        <IconButton
          aria-label="Delete Website"
          icon={<Trash />}
          backgroundColor="red.500"
        />
      </HStack>
    </Flex>
  );
}

export function Websites({ data }) {
  const items = data.map((website) => {
    return (
      <GridItem w="100%">
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

export function Home() {
  const { data, isLoading } = useMockWebsites();

  if (isLoading) {
    return <Spinner size="xl" />;
  }

  return (
    <Flex width="100%" direction="column" gap={6}>
      <Heading as="h1">Home</Heading>
      <Websites data={data} />
    </Flex>
  );
}
