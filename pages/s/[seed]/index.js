import dynamic from "next/dynamic";
import Head from "next/head";
import { useState } from "react";
import { useWebsite } from "../../../hooks/useWebsite";
import { TimeRanges } from "../../../utils/enums";
import { dropProtocol } from "../../../utils/urls";
import { Performance } from "../../../components/charts/Performance";
import { RealtimeVisitors } from "../../../components/RealtimeVisitors";
import { RangeSelector } from "../../../components/RangeSelector";
import { PageHeading } from "../../../components/PageHeading";
import { Linear } from "../../../components/charts/Linear";

export async function getServerSideProps(context) {
  const { seed } = context.query;

  return {
    props: { seed },
  };
}

const Area = dynamic(() => import("../../../components/charts/Area"), { ssr: false });

const Website = ({ seed }) => {
  const { website, isLoading, isError } = useWebsite({ seed });
  const [timeRange, setTimeRange] = useState(TimeRanges.DAY);

  if (isError) return <div>failed to load</div>;

  return (
    <div className="h-full py-8 px-4 sm:px-10 space-y-4 bg-gray-900">
      <Head>
        <title>View Website</title>
      </Head>

      <PageHeading
        title={isLoading ? "" : dropProtocol(website.url)}
        breadcumbs={["Websites", "Dashboard"]}
        subtitle={<RealtimeVisitors seed={seed} />}
        actions={<RangeSelector onSelected={(value) => setTimeRange(value)} />}
        EXPERIMENTAL_IS_DARK={true}
      />

      <Performance url={`/api/metrics/${seed}/performance`} timeRange={timeRange} />

      <Area url={`/api/metrics/${seed}/views/series`} timeRange={timeRange} />

      <div className="grid md:grid-cols-3 gap-4 gap-y-10 sm:divide-x-2 divide-gray-800">
        <Linear title="Os" url={`/api/metrics/${seed}/views/oses`} timeRange={timeRange} />
        <Linear title="Browser" url={`/api/metrics/${seed}/views/browsers`} timeRange={timeRange} />
        <Linear
          title="Country"
          url={`/api/metrics/${seed}/views/countries`}
          timeRange={timeRange}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 pt-6 sm:pt-0 gap-y-10 sm:divide-x divide-gray-800">
        <Linear title="Page" url={`/api/metrics/${seed}/views/pages`} timeRange={timeRange} />
        <Linear
          title="Referrer"
          url={`/api/metrics/${seed}/views/referrers`}
          timeRange={timeRange}
        />
      </div>
    </div>
  );
};

export default Website;
