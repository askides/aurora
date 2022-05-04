import { Spinner, useColorModeValue } from "@chakra-ui/react";
import Chart from "react-apexcharts";
import { Panel, PanelBody, PanelTitle } from "../../../components/Panel";
import { useTimeseries } from "../../../lib/hooks/use-timeseries";

export function TimeseriesChart({ filters }) {
  const foreColor = useColorModeValue("black", "white");
  const barColor = useColorModeValue("#555de3", "#bfe399");
  const { data, isLoading, isError } = useTimeseries(filters);

  if (isLoading || isError) {
    return (
      <Panel>
        <PanelTitle>Number of Page Visits</PanelTitle>
        <PanelBody>
          <Spinner />
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelTitle>Number of Page Visits</PanelTitle>
      <PanelBody>
        <Chart
          options={{
            chart: {
              fontFamily: "inherit",
              parentHeightOffset: 0,
              toolbar: {
                show: false,
              },
              animations: {
                enabled: true,
              },
              stacked: true,
              foreColor: foreColor,
              zoom: {
                enabled: false,
              },
            },
            plotOptions: {
              bar: {
                columnWidth: "80%",
              },
            },
            dataLabels: {
              enabled: false,
            },
            fill: {
              opacity: 1,
            },
            grid: {
              padding: {
                top: -20,
                right: 0,
                left: -4,
                bottom: 20,
              },
              strokeDashArray: 4,
              xaxis: {
                lines: {
                  show: true,
                },
                labels: {
                  datetimeUTC: false,
                },
              },
            },
            xaxis: {
              labels: {
                padding: 0,
              },
              tooltip: {
                enabled: false,
              },
              axisBorder: {
                show: false,
              },
              type: "datetime",
            },
            tooltip: {
              enabled: true,
              followCursor: false,
              custom: function ({ series, seriesIndex, dataPointIndex, w }) {
                const data = w.globals.initialSeries[seriesIndex];

                return `
                  <span style="background-color: #000; color: #fff; padding: 4px 8px;font-weight:500">
                    ${data.name}: ${series[seriesIndex][dataPointIndex]}
                  </span>
                `;
              },
            },
            yaxis: {
              labels: {
                padding: 4,
              },
            },
            labels: data.map((item) => item.timeseries),
            colors: [barColor],
            legend: {
              show: true,
              fontSize: "16px",
              itemMargin: {
                horizontal: 10,
                vertical: 0,
              },
              markers: {
                width: 14,
                height: 14,
                offsetX: -4,
                offsetY: 0,
              },
            },
          }}
          series={[
            {
              name: "Page Views",
              data: data.map((item) => item.count),
            },
          ]}
          type="bar"
          height={500}
          //width={1400}
        />
      </PanelBody>
    </Panel>
  );
}
