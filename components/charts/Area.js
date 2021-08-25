import Chart from "react-apexcharts";
import { useGraph } from "../../hooks/useGraph";

const format = ({ labels }) => ({
  chart: {
    height: 350,
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
      opacity: 0.5,
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
      offsetX: -15,
      offsetY: 0,
    },
  },
  xaxis: {
    type: "datetime",
    categories: labels,
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
    tooltip: {
      enabled: false,
    },
  },
  tooltip: {
    x: {
      format: "dd/MM/yy HH:mm",
    },
  },
});

const Area = ({ url, timeRange }) => {
  const { graph } = useGraph(url, timeRange);

  return (
    <Chart
      options={format({ labels: graph ? graph.labels : [] })}
      series={graph ? graph.series : []}
      type="area"
      height={350}
    />
  );
};

export default Area;
