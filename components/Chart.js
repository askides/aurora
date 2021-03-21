import useSWR from "swr";
import { useState } from "react";
import { LineChart, PieChart, ColumnChart } from "react-chartkick";
import "chart.js";

const Chart = ({ url, timeRange, title = "Chart" }) => {
  const fetcher = (...args) => {
    const [url, params] = args;

    return fetch(`${url}?range=${params.range}`)
      .then((res) => res.json())
      .then((res) => res.data);
  };

  const { data, error } = useSWR([url, timeRange], (url, range) => fetcher(url, { range }));

  if (error) return <div>failed to load</div>;
  if (!data) return <div class="animate-pulse rounded-lg bg-gray-200 h-96 w-full"></div>;

  return (
    <div className="bg-white w-full overflow-hidden shadow rounded-lg divide-y divide-gray-200">
      <div className="bg-white px-4 py-5 sm:px-6">
        <div className="-ml-4 -mt-4 flex justify-between items-center flex-wrap sm:flex-nowrap">
          <div className="ml-4 mt-4">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
          </div>
          <div className="ml-4 mt-4 flex-shrink-0"></div>
        </div>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <ColumnChart data={data} />
      </div>
    </div>
  );
};

export default Chart;
