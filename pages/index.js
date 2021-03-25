import { useState } from "react";
import PageHeader from "../components/PageHeader";
import Chart from "../components/Chart";
import ListView from "../components/ListView";
import Stats from "../components/Stats";
import Header from "../components/layout/Header";

const Home = () => {
  const [timeRange, setTimeRange] = useState("this_day");

  return (
    <div className="h-full rounded-lg space-y-4 bg-gray-900">
      <Header />
      <PageHeader onTimeRangeChange={(value) => setTimeRange(value)} />
      <Stats timeRange={timeRange} />
      <Chart
        url="/api/metrics/views/series"
        timeRange={timeRange}
        title="Page Views"
        type="areaChart"
      />
      <ListView />
      <Chart url="/api/metrics/views/browsers" timeRange={timeRange} />
      <Chart url="/api/metrics/views/oses" timeRange={timeRange} />
    </div>
  );
};

export default Home;
