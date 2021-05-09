import Chart from "react-apexcharts";

const Area = () => {
  const data = {
    series: [
      {
        name: "series1",
        data: [31, 40, 28, 100, 51, 300, 420, 109, 100, 1230],
      },
    ],
    options: {
      chart: {
        height: 350,
        type: "area",
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
        // sparkline: {
        //   enabled: true,
        // },
      },
      grid: {
        row: {
          // colors: ["#e5e5e5", "transparent"],
          opacity: 0.5,
        },
        column: {
          //colors: ["#f8f8f8", "transparent"],
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
        xaxis: {
          lines: {
            show: false,
          },
        },
        show: false,
        padding: {
          left: 0,
          right: 0,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
      },
      yaxis: {
        labels: {
          show: true,
          style: {
            colors: "#FFFFFF",
            fontSize: "14px",
            fontWeight: 800,
            cssClass: "apexcharts-xaxis-label",
          },
          padding: {
            left: 0,
            right: 0,
          },
        },
      },
      xaxis: {
        type: "datetime",
        categories: [
          "2018-09-19T00:00:00.000Z",
          "2018-09-19T01:30:00.000Z",
          "2018-09-19T02:30:00.000Z",
          "2018-09-19T03:30:00.000Z",
          "2018-09-19T04:30:00.000Z",
          "2018-09-19T05:30:00.000Z",
          "2018-09-19T06:30:00.000Z",
          "2018-09-19T07:30:00.000Z",
          "2018-09-19T08:30:00.000Z",
          "2018-09-19T09:30:00.000Z",
          "2018-09-19T010:30:00.000Z",
        ],
        axisBorder: {
          show: false,
        },
        lines: {
          show: false,
        },
        labels: {
          show: true,
          style: {
            colors: "#FFFFFF",
            fontSize: "14px",
            fontWeight: 800,
            cssClass: "apexcharts-xaxis-label",
          },
        },
      },
      tooltip: {
        x: {
          format: "dd/MM/yy HH:mm",
        },
      },
    },
  };

  return <Chart options={data.options} series={data.series} type="area" height={350} />;
};

export default Area;
