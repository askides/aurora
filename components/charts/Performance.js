import { Jumbo } from "./Jumbo";
import { useGraph } from "../../hooks/useGraph";

export const Performance = ({ url, timeRange }) => {
  const { graph } = useGraph(url, timeRange);

  if (!graph) {
    return (
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4 sm:divide-x divide-gray-200 dark:divide-gray-800">
        <Jumbo title="Total Views" value="_" />
        <Jumbo title="Unique Visitors" value="_" />
        <Jumbo title="Bounces" value="_" />
        <Jumbo title="Avg Visit Time" value="_" />
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4 sm:divide-x divide-gray-200 dark:divide-gray-800">
      <Jumbo title="Total Views" value={graph.pageViews.cp} />
      <Jumbo title="Unique Visitors" value={graph.uniqueVisitors.cp} />
      <Jumbo title="Bounces" value={graph.bounceRate.cp} />
      <Jumbo title="Avg Visit Time" value={`${graph.visitDuration.cp}s`} />
    </dl>
  );
};
