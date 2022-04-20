import { Flex, Select } from "@chakra-ui/react";
import { subDays } from "date-fns";
import * as React from "react";
import { useTimeseries } from "../lib/hooks/use-timeseries";
import { filtersReducer } from "../lib/reducers/filters-reducer";
import { BrowserDatatable } from "./Charts/BrowserDatatable";
import { CountryDatatable } from "./Charts/CountryDatatable";
import { DeviceDatatable } from "./Charts/DeviceDatatable";
import { OsDatatable } from "./Charts/OsDatatable";
import { PageDatatable } from "./Charts/PageDatatable";
import { ReferrerDatatable } from "./Charts/ReferrerDatatable";
import { TimeseriesChart } from "./Charts/TimeseriesChart";

export function Analytics({ wid }) {
  // Filters Logic
  const initialState = {
    wid: wid,
    start: subDays(new Date(), 1).getTime(),
    end: new Date().getTime(),
    unit: "hour",
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const [filters, dispatch] = React.useReducer(filtersReducer, initialState);

  // TODO: Move to the components
  const { data, isLoading, isError } = useTimeseries(filters);

  const handleChange = (e) => {
    dispatch({ type: e.target.value });
  };

  return (
    <div>
      <pre>
        <code>{JSON.stringify(filters, null, 2)}</code>
      </pre>

      <Flex direction="column" gap={5}>
        <Select onChange={handleChange}>
          <option value="LAST_24_HOURS">Last 24 Hours</option>
          <option value="LAST_7_DAYS">Last 7 Days</option>
        </Select>

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
          <TimeseriesChart data={data ?? []} />
        </Flex>

        <Flex gap={5}>
          <PageDatatable filters={filters} />
          <ReferrerDatatable filters={filters} />
          <DeviceDatatable filters={filters} />
        </Flex>

        <Flex gap={5}>
          <OsDatatable filters={filters} />
          <BrowserDatatable filters={filters} />
          <CountryDatatable filters={filters} />
        </Flex>
      </Flex>
    </div>
  );
}
