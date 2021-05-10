import { Jumbo } from "./Jumbo";
import { useGraph } from "../../hooks/useGraph";

export const Performance = ({ url, timeRange }) => {
  const { graph, isLoading, isError } = useGraph(url, timeRange);

  if (isLoading) return <div>Loading ...</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-4 sm:divide-x divide-gray-800">
      <Jumbo title="Total Views" value={graph.pageViews.cp} />
      <Jumbo title="Unique Visitors" value={graph.uniqueVisitors.cp} />
      <Jumbo title="Bounces" value={graph.bounceRate.cp} />
      <Jumbo title="Avg Visit Time" value="24s" />
    </dl>
  );
};
