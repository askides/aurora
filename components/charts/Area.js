import Chart from "react-apexcharts";
import dynamic from "next/dynamic";
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

const Loader = dynamic(() => import("../Loader").then((mod) => mod.Loader), { ssr: false });

const Area = ({ url, timeRange }) => {
  const { graph, isLoading, isError } = useGraph(url, timeRange);

  if (isLoading) return <Loader width={540} height={350} />;
  if (isError) return <div>failed to load</div>;

  return (
    <Chart
      options={format({ labels: graph.labels })}
      series={graph.series}
      type="area"
      height={350}
    />
  );
};

export default Area;
