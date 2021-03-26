import useSWR from "swr";
import React from "react";
import { ColumnChart, AreaChart } from "react-chartkick";
import "chart.js";

const Components = {
  columnChart: ColumnChart,
  areaChart: AreaChart,
};

const Chart = ({ url, timeRange, title = "Chart", type = "columnChart" }) => {
  const fetcher = (...args) => {
    const [url, params] = args;

    return fetch(`${url}?range=${params.range}`)
      .then((res) => res.json())
      .then((res) => res.data);
  };

  const { data, error } = useSWR([url, timeRange], (url, range) => fetcher(url, { range }));

  if (error) return <div>failed to load</div>;
  if (!data) return <div className="animate-pulse rounded-lg bg-gray-200 h-96 w-full"></div>;

  return (
    <div className="bg-white dark:bg-gray-800 w-full overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
      <div className="px-4 py-5 sm:px-6">
        <div className="-ml-4 -mt-4 flex justify-between items-center flex-wrap sm:flex-nowrap">
          <div className="ml-4 mt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-green-400">
              {title}
            </h3>
          </div>
          <div className="ml-4 mt-4 flex-shrink-0"></div>
        </div>
      </div>
      <div className="px-4 py-5 sm:p-6">
        {React.createElement(Components[type], {
          data: data,
          colors: ["#66c48170", "#666"],
          curve: false,
          points: false,
          library: {
            legend: {
              labels: {
                fontColor: "#fff",
              },
            },
            scales: {
              yAxes: [
                {
                  ticks: { fontColor: "#fff" },
                  scaleLabel: { fontColor: "#fff" },
                },
              ],
              xAxes: [
                {
                  ticks: { fontColor: "#fff" },
                },
              ],
            },
          },
        })}
      </div>
    </div>
  );
};

export default Chart;
