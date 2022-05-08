import { Flex, Select, SimpleGrid } from "@chakra-ui/react";
import { subDays } from "date-fns";
import * as React from "react";
import { filtersReducer } from "../../lib/reducers/filters-reducer";
import { BrowserTable } from "./Charts/BrowserTable";
import { CountryTable } from "./Charts/CountryTable";
import { DeviceTable } from "./Charts/DeviceTable";
import { OsTable } from "./Charts/OsTable";
import { PageTable } from "./Charts/PageTable";
import { ReferrerTable } from "./Charts/ReferrerTable";
import { Stats } from "./Charts/Stats";
import { TimeseriesChart } from "./Charts/TimeseriesChart";

export function AnalyticsDashboard({ wid }) {
  // Filters Logic
  const initialState = {
    wid: wid,
    start: subDays(new Date(), 1).getTime(),
    end: new Date().getTime(),
    unit: "hour",
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const [filters, dispatch] = React.useReducer(filtersReducer, initialState);

  const handleChange = (e) => {
    dispatch({ type: e.target.value });
  };

  return (
    <Flex direction="column" gap={5}>
      <Select onChange={handleChange}>
        <option value="LAST_24_HOURS">Last 24 Hours</option>
        <option value="LAST_7_DAYS">Last 7 Days</option>
        <option value="LAST_30_DAYS">Last 30 Days</option>
      </Select>

      <Stats filters={filters} />

      <TimeseriesChart filters={filters} />

      <SimpleGrid spacing={5} columns={{ sm: 1, md: 2 }}>
        <PageTable filters={filters} />
        <ReferrerTable filters={filters} />
      </SimpleGrid>

      <SimpleGrid spacing={5} columns={{ sm: 1, md: 2 }}>
        <DeviceTable filters={filters} />
        <OsTable filters={filters} />
      </SimpleGrid>

      <SimpleGrid spacing={5} columns={{ sm: 1, md: 2 }}>
        <BrowserTable filters={filters} />
        <CountryTable filters={filters} />
      </SimpleGrid>
    </Flex>
  );
}
