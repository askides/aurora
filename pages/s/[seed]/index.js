import dynamic from "next/dynamic";
import Head from "next/head";
import { useState } from "react";
import { withAuth } from "../../../hoc/withAuth";
import { useWebsite } from "../../../hooks/useWebsite";
import { TimeRanges } from "../../../utils/enums";
import { dropProtocol } from "../../../utils/urls";
import { Performance } from "../../../components/charts/Performance";
import { BrowserViews } from "../../../components/charts/BrowserViews";
import { OsViews } from "../../../components/charts/OsViews";
import { PageViews } from "../../../components/charts/PageViews";
import { CountryViews } from "../../../components/charts/CountryViews";
import { RealtimeVisitors } from "../../../components/RealtimeVisitors";
import { RangeSelector } from "../../../components/RangeSelector";
import { PageHeading } from "../../../components/PageHeading";
import { Alert } from "../../../components/Alert";
import { Show } from "../../../components/Show";
import { demo } from "../../../utils/demo";

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

  if (isLoading) return <div>Loading..</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <div className="h-full py-8 px-4 sm:px-10 space-y-4 bg-gray-900">
      <Head>
        <title>Preview {dropProtocol(website.url)}</title>
      </Head>

      <PageHeading
        title={isLoading ? "" : dropProtocol(website.url)}
        breadcumbs={["Websites", "Dashboard"]}
        subtitle={<RealtimeVisitors seed={seed} />}
        actions={<RangeSelector onSelected={(value) => setTimeRange(value)} />}
        EXPERIMENTAL_IS_DARK={true}
      />

      <Show when={demo()}>
        <Alert
          style="alert"
          title="Please note that as this is a demo, the data is refreshed frequently."
        />
      </Show>

      <Performance url={`/api/metrics/${seed}/performance`} timeRange={timeRange} />

      <Area url={`/api/metrics/${seed}/views/series`} timeRange={timeRange} />

      <div className="grid md:grid-cols-2 gap-4">
        <PageViews url={`/api/metrics/${seed}/views/pages`} timeRange={timeRange} />
        <OsViews url={`/api/metrics/${seed}/views/oses`} timeRange={timeRange} />
        <BrowserViews url={`/api/metrics/${seed}/views/browsers`} timeRange={timeRange} />
        <CountryViews url={`/api/metrics/${seed}/views/countries`} timeRange={timeRange} />
      </div>
    </div>
  );
};

export default Website;
