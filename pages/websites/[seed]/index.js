import { useState } from "react";
import WebsiteInfo from "../../../components/WebsiteInfo";
import Chart from "../../../components/charts/Chart";
import Performance from "../../../components/charts/Performance";
import { withAuth } from "../../../components/utils/withAuth";
import BrowserViews from "../../../components/charts/BrowserViews";
import OsViews from "../../../components/charts/OsViews";
import PageViews from "../../../components/charts/PageViews";
import CountryViews from "../../../components/charts/CountryViews";

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
      <WebsiteInfo
        url={`/api/metrics/${seed}/realtime/visitors`}
        onTimeRangeChange={(value) => setTimeRange(value)}
      />
      <Performance url={`/api/metrics/${seed}/performance`} timeRange={timeRange} />
      <Chart
        url={`/api/metrics/${seed}/views/series`}
        timeRange={timeRange}
        title="Page Views"
        type="areaChart"
      />
      <PageViews url={`/api/metrics/${seed}/views/pages`} timeRange={timeRange} />
      <OsViews url={`/api/metrics/${seed}/views/oses`} timeRange={timeRange} />
      <BrowserViews url={`/api/metrics/${seed}/views/browsers`} timeRange={timeRange} />
      <CountryViews url={`/api/metrics/${seed}/views/countries`} timeRange={timeRange} />
    </div>
  );
};

export default withAuth(Website);
