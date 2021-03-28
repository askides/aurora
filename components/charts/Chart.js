import useSWR from "swr";
import React from "react";
import { ColumnChart, AreaChart, LineChart } from "react-chartkick";
import { useGraph } from "../utils/useGraph";
import "chart.js";

const Components = {
  columnChart: ColumnChart,
  areaChart: AreaChart,
  lineChart: LineChart,
};

const Chart = ({ url, timeRange, title = "Chart", type = "columnChart" }) => {
  const { graph, isLoading, isError } = useGraph(url, timeRange);

  if (isLoading) return <div className="animate-pulse rounded-lg bg-gray-200 h-96 w-full"></div>;
  if (isError) return <div>failed to load</div>;

  return (
    <div className="bg-white dark:bg-gray-800 w-full overflow-hidden shadow rounded-b-lg divide-y divide-gray-200 dark:divide-gray-700">
      <div className="px-4 py-5 sm:p-6">
        {React.createElement(Components[type], {
          data: graph,
          dataset: {
            backgroundColor: "rgba(147, 197, 253, 0.1)",
            borderWidth: 3,
            lineTension: 0.2,
            // borderDash: [5, 5],
            fill: true,
          },
          curve: false,
          points: false,
          library: {
            borderWidth: 5,
            fill: true,
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
