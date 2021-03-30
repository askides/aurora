import CountUp from "react-countup";
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
        currentValue={<CountUp end={graph.pageViews.cp} />}
        previousValue={<CountUp end={graph.pageViews.lp} />}
        increment={<CountUp end={graph.pageViews.inc} />}
      />

      <StatsItem
        title="Unique Visitors"
        currentValue={<CountUp end={graph.uniqueVisitors.cp} />}
        previousValue={<CountUp end={graph.uniqueVisitors.lp} />}
        increment={<CountUp end={graph.uniqueVisitors.inc} />}
      />

      <StatsItem
        title="Bounce Rate"
        currentValue={<CountUp end={graph.bounceRate.cp} />}
        previousValue={<CountUp end={graph.bounceRate.lp} />}
        increment={<CountUp end={graph.bounceRate.inc} />}
      />
    </Stats>
  );
};

export default Performance;
