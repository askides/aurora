import Chart from "react-apexcharts";

// TODO: full width
export function TimeseriesChart({ data = [] }) {
  return (
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
              <div class="bg-black opacity-75 text-white px-6 py-4 font-medium">
                <span>${data.name}: ${series[seriesIndex][dataPointIndex]}</span>
              </div>
            `;
          },
        },
        yaxis: {
          labels: {
            padding: 4,
          },
        },
        labels: data.map((item) => item.timeseries),
        colors: ["#555de3", "#bfe399"],
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
  );
}
