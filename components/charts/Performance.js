import { Stats, StatsItem, LoadingPanel } from "../Primitives";
import { useGraph } from "../utils/useGraph";

const Performance = ({ url, timeRange }) => {
  const { graph, isLoading, isError } = useGraph(url, timeRange);

  if (isLoading) return <LoadingPanel />;
  if (isError) return <div>failed to load</div>;

  return (
    <Stats>
      <StatsItem
        title="Total Views"
        currentValue={graph.pageViews.cp}
        previousValue={graph.pageViews.lp}
        increment={graph.pageViews.inc}
      />

      <StatsItem
        title="Unique Visitors"
        currentValue={graph.uniqueVisitors.cp}
        previousValue={graph.uniqueVisitors.lp}
        increment={graph.uniqueVisitors.inc}
      />

      <StatsItem
        title="Bounces"
        currentValue={graph.bounceRate.cp}
        previousValue={graph.bounceRate.lp}
        increment={graph.bounceRate.inc}
      />
    </Stats>
  );
};

export default Performance;
