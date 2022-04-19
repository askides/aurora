import { Box, Flex, Grid, GridItem, Heading, Text } from "@chakra-ui/react";

export const percentage = (n, t) => (n / t) * 100;

export function DatatableRowOverlay({ percentage }) {
  return (
    <Box
      position="absolute"
      height="100%"
      width={`${percentage}%`}
      bg="blackAlpha.100"
      rounded="sm"
      top={0}
      left={0}
      right={0}
      bottom={0}
    />
  );
}

export function DatatableRow({ views, unique, element, percentage = 0 }) {
  return (
    <Box position="relative">
      <DatatableRowOverlay percentage={percentage} />
      <Grid templateColumns="repeat(5, 1fr)" gap={3}>
        <GridItem colSpan={3} w="100%">
          {element}
        </GridItem>
        <GridItem w="100%" textAlign="right">
          {views}
        </GridItem>
        <GridItem w="100%" textAlign="right">
          {unique}
        </GridItem>
      </Grid>
    </Box>
  );
}

export function DatatableHead() {
  return (
    <Grid templateColumns="repeat(5, 1fr)" gap={5}>
      <GridItem colSpan={3} w="100%">
        Content
      </GridItem>
      <GridItem w="100%" textAlign="right">
        Views
      </GridItem>
      <GridItem w="100%" textAlign="right">
        Unique
      </GridItem>
    </Grid>
  );
}

export function Datatable({ title, data = [] }) {
  const totalViews = data.reduce((acc, el) => acc + Number(el.views), 0);

  const rows = data.map((row, index) => {
    const perc = percentage(row.views, totalViews);
    return <DatatableRow {...row} percentage={perc} key={index} />;
  });

  return (
    <Box flex={1} boxShadow="xs" p="6" rounded="md" bg="white">
      <Flex gap={4} direction="column">
        <Heading as="h3" size="sm">
          {title}
        </Heading>

        <DatatableHead />

        {rows.length > 0 ? rows : <Text>No data available</Text>}
      </Flex>
    </Box>
  );
}
