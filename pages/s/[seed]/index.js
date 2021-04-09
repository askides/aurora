import { useState } from "react";
import { withAuth } from "../../../components/hoc/withAuth";
import { TimeRanges } from "../../../utils/enums";
import Chart from "../../../components/charts/Chart";
import Performance from "../../../components/charts/Performance";
import BrowserViews from "../../../components/charts/BrowserViews";
import OsViews from "../../../components/charts/OsViews";
import PageViews from "../../../components/charts/PageViews";
import CountryViews from "../../../components/charts/CountryViews";
import WebsiteName from "../../../components/WebsiteName";
import WebsiteCurrentVisitors from "../../../components/WebsiteCurrentVisitors";
import RangeSelector from "../../../components/RangeSelector";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Website = ({ seed }) => {
  const [timeRange, setTimeRange] = useState(TimeRanges.DAY);

  return (
    <div className="h-full rounded-lg space-y-4 bg-gray-900">
      <div className="mt-2 md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0 space-y-2">
          <WebsiteName seed={seed} />
          <WebsiteCurrentVisitors seed={seed} />
        </div>
        <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
          <RangeSelector onSelected={(value) => setTimeRange(value)} />
        </div>
      </div>

      <div>
        <Performance url={`/api/metrics/${seed}/performance`} timeRange={timeRange} />
        <Chart url={`/api/metrics/${seed}/views/series`} timeRange={timeRange} title="Page Views" type="lineChart" />
      </div>

      <PageViews url={`/api/metrics/${seed}/views/pages`} timeRange={timeRange} />
      <OsViews url={`/api/metrics/${seed}/views/oses`} timeRange={timeRange} />
      <BrowserViews url={`/api/metrics/${seed}/views/browsers`} timeRange={timeRange} />
      <CountryViews url={`/api/metrics/${seed}/views/countries`} timeRange={timeRange} />
    </div>
  );
};

export default Website;
