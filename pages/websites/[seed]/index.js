import dynamic from "next/dynamic";
import Head from "next/head";
import { useState } from "react";
import { withAuth } from "../../../hoc/withAuth";
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

  //if (isError) return <div>failed to load</div>;

  return (
    <div className="h-full py-8 px-4 sm:px-10 space-y-4 bg-gray-900">
      <Head>
        <title>View Website</title>
      </Head>

      <PageHeading
        title={website && !isLoading ? "" : dropProtocol("ciao")}
        breadcumbs={["Websites", "Dashboard"]}
        subtitle={<RealtimeVisitors seed={seed} />}
        actions={<RangeSelector onSelected={(value) => setTimeRange(value)} />}
        EXPERIMENTAL_IS_DARK={true}
      />

      <Performance url={`/v2/metrics/${seed}/performance`} timeRange={timeRange} />

      <Area url={`/v2/metrics/${seed}/views/series`} timeRange={timeRange} />

      <div className="grid md:grid-cols-3 gap-4 gap-y-10 sm:divide-x-2 divide-gray-800">
        <Linear title="Os" url={`/v2/metrics/${seed}/views/os`} timeRange={timeRange} />
        <Linear title="Browser" url={`/v2/metrics/${seed}/views/browser`} timeRange={timeRange} />
        <Linear title="Country" url={`/v2/metrics/${seed}/views/country`} timeRange={timeRange} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 pt-6 sm:pt-0 gap-y-10 sm:divide-x divide-gray-800">
        <Linear title="Page" url={`/v2/metrics/${seed}/views/page`} timeRange={timeRange} />
        <Linear title="Referrer" url={`/v2/metrics/${seed}/views/referrer`} timeRange={timeRange} />
      </div>
    </div>
  );
};

export default withAuth(Website);
