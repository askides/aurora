import React from "react";
import { ColumnChart, AreaChart, LineChart } from "react-chartkick";
import { Panel } from "../Panel";
import { useGraph } from "../../hooks/useGraph";
import "chart.js";

const Components = {
  columnChart: ColumnChart,
  areaChart: AreaChart,
  lineChart: LineChart,
};

export const Chart = ({ url, timeRange, type = "columnChart" }) => {
  const { graph, isLoading, isError } = useGraph(url, timeRange);

  if (isLoading) return <div>Loading ...</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <Panel>
      {React.createElement(Components[type], {
        data: graph,
        dataset: {
          backgroundColor: "rgba(147, 197, 253, 0.1)",
          borderWidth: 3,
          lineTension: 0.2,
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
    </Panel>
  );
};
