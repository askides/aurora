import { Stats } from "../Stats";
import { useGraph } from "../../hooks/useGraph";

export const Performance = ({ url, timeRange }) => {
  const { graph, isLoading, isError } = useGraph(url, timeRange);

  if (isLoading) return <div>Loading ...</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <Stats
      stats={[
        {
          name: "Total Views",
          stat: graph.pageViews.cp,
          previousStat: graph.pageViews.lp,
          change: graph.pageViews.inc,
          changeType: graph.pageViews.inc >= 0 ? "increase" : "decrease",
        },
        {
          name: "Unique Visitors",
          stat: graph.uniqueVisitors.cp,
          previousStat: graph.uniqueVisitors.lp,
          change: graph.uniqueVisitors.inc,
          changeType: graph.uniqueVisitors.inc >= 0 ? "increase" : "decrease",
        },
        {
          name: "Bounces",
          stat: graph.bounceRate.cp,
          previousStat: graph.bounceRate.lp,
          change: graph.bounceRate.inc,
          changeType: graph.bounceRate.inc >= 0 ? "increase" : "decrease",
        },
      ]}
    />
  );
};
