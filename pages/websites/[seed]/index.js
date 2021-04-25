import { useState } from "react";
import { withAuth } from "../../../hoc/withAuth";
import { useWebsite } from "../../../hooks/useWebsite";
import { TimeRanges } from "../../../utils/enums";
import { Chart } from "../../../components/charts/Chart";
import { Performance } from "../../../components/charts/Performance";
import { BrowserViews } from "../../../components/charts/BrowserViews";
import { OsViews } from "../../../components/charts/OsViews";
import { PageViews } from "../../../components/charts/PageViews";
import { CountryViews } from "../../../components/charts/CountryViews";
import { RealtimeVisitors } from "../../../components/RealtimeVisitors";
import { RangeSelector } from "../../../components/RangeSelector";
import { PageHeading } from "../../../components/PageHeading";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Website = ({ seed }) => {
  const { website, isLoading, isError } = useWebsite({ seed });
  const [timeRange, setTimeRange] = useState(TimeRanges.DAY);

  if (isLoading) return <div>Loading..</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <div className="h-full p-6 space-y-4 bg-gray-900">
      <PageHeading
        title={isLoading ? "" : website.url}
        breadcumbs={["Websites", "Dashboard"]}
        subtitle={<RealtimeVisitors seed={seed} />}
        actions={<RangeSelector onSelected={(value) => setTimeRange(value)} />}
        EXPERIMENTAL_IS_DARK={true}
      />

      <Performance url={`/api/metrics/${seed}/performance`} timeRange={timeRange} />
      <Chart url={`/api/metrics/${seed}/views/series`} timeRange={timeRange} type="lineChart" />

      <div className="grid md:grid-cols-2 gap-4">
        <PageViews url={`/api/metrics/${seed}/views/pages`} timeRange={timeRange} />
        <OsViews url={`/api/metrics/${seed}/views/oses`} timeRange={timeRange} />
        <BrowserViews url={`/api/metrics/${seed}/views/browsers`} timeRange={timeRange} />
        <CountryViews url={`/api/metrics/${seed}/views/countries`} timeRange={timeRange} />
      </div>
    </div>
  );
};

export default withAuth(Website);
