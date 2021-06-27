import dynamic from "next/dynamic";
import { range } from "lodash";
import { Jumbo } from "./Jumbo";
import { useGraph } from "../../hooks/useGraph";

const Loader = dynamic(() => import("../Loader").then((mod) => mod.Loader), { ssr: false });

const LoaderWrapper = () => (
  <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4 sm:divide-x divide-gray-200 dark:divide-gray-800">
    {range(4).map((el, key) => (
      <Loader key={key} width={200} height={116} />
    ))}
  </dl>
);

export const Performance = ({ url, timeRange }) => {
  const { graph, isLoading, isError } = useGraph(url, timeRange);

  if (isLoading) return <LoaderWrapper />;
  if (isError) return <div>failed to load</div>;

  return (
    <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4 sm:divide-x divide-gray-200 dark:divide-gray-800">
      <Jumbo title="Total Views" value={graph.pageViews.cp} />
      <Jumbo title="Unique Visitors" value={graph.uniqueVisitors.cp} />
      <Jumbo title="Bounces" value={graph.bounceRate.cp} />
      <Jumbo title="Avg Visit Time" value={`${graph.visitDuration.cp}s`} />
    </dl>
  );
};
