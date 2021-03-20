import useSWR from "swr";
import { useState } from "react";
import { LineChart, PieChart, ColumnChart } from "react-chartkick";
import "chart.js";

const dddd = [
  {
    name: "Page A",
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: "Page B",
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: "Page C",
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: "Page D",
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
  {
    name: "Page E",
    uv: 1890,
    pv: 4800,
    amt: 2181,
  },
  {
    name: "Page F",
    uv: 2390,
    pv: 3800,
    amt: 2500,
  },
  {
    name: "Page G",
    uv: 3490,
    pv: 4300,
    amt: 2100,
  },
];

const SimpleChart = () => {
  const [timeRange, setTimeRange] = useState("this_day");
  const fetcher = (...args) => {
    const [url, params] = args;

    return fetch(`${url}?range=${params.range}`)
      .then((res) => res.json())
      .then((res) => res.data);
  };

  const { data, error } = useSWR(["/api/metrics/views/series", timeRange], (url, range) =>
    fetcher(url, { range })
  );

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <div className="bg-white w-full overflow-hidden shadow rounded-lg divide-y divide-gray-200">
      <div className="bg-white px-4 py-5 sm:px-6">
        <div className="-ml-4 -mt-4 flex justify-between items-center flex-wrap sm:flex-nowrap">
          <div className="ml-4 mt-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Job Postings</h3>
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

export default SimpleChart;
