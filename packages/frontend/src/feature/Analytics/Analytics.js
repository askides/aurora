import { Flex, Select } from "@chakra-ui/react";
import { subDays } from "date-fns";
import * as React from "react";
import { Statistics } from "../../components/Statistics";
import { useTimeseries } from "../../lib/hooks/use-timeseries";
import { filtersReducer } from "../../lib/reducers/filters-reducer";
import { BrowserTable } from "../Charts/BrowserTable";
import { CountryTable } from "../Charts/CountryTable";
import { DeviceTable } from "../Charts/DeviceTable";
import { OsTable } from "../Charts/OsTable";
import { PageTable } from "../Charts/PageTable";
import { ReferrerTable } from "../Charts/ReferrerTable";
import { TimeseriesChart } from "../Charts/TimeseriesChart";

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

        <Statistics filters={filters} />

        <Flex boxShadow="xs" p="6" rounded="md" bg="white">
          <TimeseriesChart data={data ?? []} />
        </Flex>

        <Flex gap={5}>
          <PageTable filters={filters} />
          <ReferrerTable filters={filters} />
          <DeviceTable filters={filters} />
        </Flex>

        <Flex gap={5}>
          <OsTable filters={filters} />
          <BrowserTable filters={filters} />
          <CountryTable filters={filters} />
        </Flex>
      </Flex>
    </div>
  );
}
