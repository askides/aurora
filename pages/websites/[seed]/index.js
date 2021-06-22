import dynamic from "next/dynamic";
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
import { Container } from "../../../components/Container";

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

  return (
    <Container>
      <div className="flex flex-col justify-center items-start max-w-5xl w-full mx-auto mb-16">
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
          Dashboard
        </h1>

        <p className="prose leading-relaxed text-gray-600 dark:text-gray-400 mb-4">
          These are your websites, you can manage them by clicking on the proper buttons.
        </p>

        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-8 mt-8 w-full space-y-10">
          <PageHeading
            title={isLoading ? "" : dropProtocol(website.url)}
            subtitle={<RealtimeVisitors seed={seed} />}
            actions={<RangeSelector onSelected={(value) => setTimeRange(value)} />}
          />

          <Performance url={`/v2/metrics/${seed}/performance`} timeRange={timeRange} />

          <Area url={`/v2/metrics/${seed}/views/series`} timeRange={timeRange} />

          <div className="grid md:grid-cols-3 gap-4 gap-y-10 sm:divide-x divide-gray-200 dark:divide-gray-800">
            <Linear title="Os" url={`/v2/metrics/${seed}/views/os`} timeRange={timeRange} />
            <Linear
              title="Browser"
              url={`/v2/metrics/${seed}/views/browser`}
              timeRange={timeRange}
            />
            <Linear
              title="Country"
              url={`/v2/metrics/${seed}/views/country`}
              timeRange={timeRange}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-6 sm:pt-0 gap-y-10 sm:divide-x divide-gray-200 dark:divide-gray-800">
            <Linear title="Page" url={`/v2/metrics/${seed}/views/page`} timeRange={timeRange} />
            <Linear
              title="Referrer"
              url={`/v2/metrics/${seed}/views/referrer`}
              timeRange={timeRange}
            />
          </div>
        </div>
      </div>
    </Container>
  );
};

export default withAuth(Website);
