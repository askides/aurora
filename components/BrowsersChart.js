import useSWR from "swr";
import { useState } from "react";
import { LineChart, PieChart, ColumnChart } from "react-chartkick";
import "chart.js";

const BrowsersChart = () => {
  const [timeRange, setTimeRange] = useState("this_day");
  const fetcher = (...args) => {
    const [url, params] = args;

    return fetch(`${url}?range=${params.range}`)
      .then((res) => res.json())
      .then((res) => res.data);
  };

  const { data, error } = useSWR(["/api/metrics/views/browsers", timeRange], (url, range) =>
    fetcher(url, { range })
  );

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <div className="bg-white w-full overflow-hidden shadow rounded-lg divide-y divide-gray-200">
      <div className="bg-white px-4 py-5 sm:px-6">
        <div className="-ml-4 -mt-4 flex justify-between items-center flex-wrap sm:flex-nowrap">
          <div className="ml-4 mt-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Browsers Chart</h3>
            <p className="mt-1 text-sm text-gray-500">
              Lorem ipsum dolor sit amet consectetur adipisicing elit quam corrupti consectetur.
            </p>
          </div>
          <div className="ml-4 mt-4 flex-shrink-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option defaultValue="this_day" value="this_day">
                Today
              </option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <ColumnChart data={data} />
      </div>
    </div>
  );
};

export default BrowsersChart;
