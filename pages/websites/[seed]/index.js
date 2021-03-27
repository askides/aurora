import { useState } from "react";
import WebsiteInfo from "../../../components/WebsiteInfo";
import Chart from "../../../components/charts/Chart";
import ListView from "../../../components/charts/ListView";
import Stats from "../../../components/Stats";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Website = ({ seed }) => {
  const [timeRange, setTimeRange] = useState("this_day");

  return (
    <div className="h-full rounded-lg space-y-4 bg-gray-900">
      <WebsiteInfo onTimeRangeChange={(value) => setTimeRange(value)} />
      <Stats url={`/api/metrics/${seed}/performance`} timeRange={timeRange} />
      <Chart
        url={`/api/metrics/${seed}/views/series`}
        timeRange={timeRange}
        title="Page Views"
        type="areaChart"
      />
      <ListView url={`/api/metrics/${seed}/page-views`} />
      <Chart url={`/api/metrics/${seed}/views/browsers`} title="Browsers" timeRange={timeRange} />
      <Chart
        url={`/api/metrics/${seed}/views/oses`}
        title="Operative Systems"
        timeRange={timeRange}
      />
    </div>
  );
};

export default Website;
