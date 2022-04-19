import { Flex } from "@chakra-ui/react";
import * as React from "react";
import { Datatable } from "./Datatable";
import { TimeseriesChart } from "./TimeseriesChart";

export function Analytics({ wid }) {
  return (
    <div>
      <Flex direction="column" gap={5}>
        <Flex gap={5}>
          <Flex flex={1} boxShadow="xs" p="6" rounded="md" bg="white">
            Page Views
          </Flex>
          <Flex flex={1} boxShadow="xs" p="6" rounded="md" bg="white">
            Unique Visitors
          </Flex>
          <Flex flex={1} boxShadow="xs" p="6" rounded="md" bg="white">
            Bounce Rate
          </Flex>
          <Flex flex={1} boxShadow="xs" p="6" rounded="md" bg="white">
            Average Visit Time
          </Flex>
        </Flex>

        <Flex boxShadow="xs" p="6" rounded="md" bg="white">
          <TimeseriesChart data={[]} />
        </Flex>

        <Flex gap={5}>
          <Datatable title="Page" data={[]} />
          <Datatable title="Referrer" data={[]} />
        </Flex>

        <Flex gap={5}>
          <Datatable title="Operating System" data={[]} />
          <Datatable title="Browser" data={[]} />
          <Datatable title="Country" data={[]} />
        </Flex>
      </Flex>
    </div>
  );
}
