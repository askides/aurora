import dynamic from "next/dynamic";
import { useState } from "react";
import { useWebsite } from "../hooks/useWebsite";
import { TimeRanges } from "../utils/enums";
import { dropProtocol } from "../utils/urls";
import { Performance } from "./charts/Performance";
import { RealtimeVisitors } from "./RealtimeVisitors";
import { RangeSelector } from "./RangeSelector";
import { Linear } from "./charts/Linear";

const Area = dynamic(() => import("./charts/Area"), {
  ssr: false,
  loading: () => <div style={{ height: 350 }}></div>,
});

export const Dashboard = ({ seed }) => {
  const { website, isLoading, isError } = useWebsite({ seed });
  const [timeRange, setTimeRange] = useState(TimeRanges.DAY);

  return (
    <div className="sm:border border-gray-200 dark:border-gray-800 rounded-lg py-8 sm:p-8 w-full space-y-10">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate text-black dark:text-white">
            {isLoading ? "_" : dropProtocol(website.url)}
          </h2>

          <div className="pt-2 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
            <RealtimeVisitors seed={seed} />
          </div>
        </div>

        <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4 space-x-3">
          <RangeSelector onSelected={(value) => setTimeRange(value)} />
        </div>
      </div>

      <Performance url={`/v2/metrics/${seed}/performance`} timeRange={timeRange} />

      <Area url={`/v2/metrics/${seed}/views/series`} timeRange={timeRange} />

      <div className="grid md:grid-cols-3 gap-4 gap-y-10 sm:divide-x divide-gray-200 dark:divide-gray-800">
        <Linear title="Os" url={`/v2/metrics/${seed}/views/os`} timeRange={timeRange} />
        <Linear title="Browser" url={`/v2/metrics/${seed}/views/browser`} timeRange={timeRange} />
        <Linear title="Country" url={`/v2/metrics/${seed}/views/country`} timeRange={timeRange} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 pt-6 sm:pt-0 gap-y-10 sm:divide-x divide-gray-200 dark:divide-gray-800">
        <Linear title="Page" url={`/v2/metrics/${seed}/views/page`} timeRange={timeRange} />
        <Linear title="Referrer" url={`/v2/metrics/${seed}/views/referrer`} timeRange={timeRange} />
      </div>
    </div>
  );
};
