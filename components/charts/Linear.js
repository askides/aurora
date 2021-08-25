import dynamic from "next/dynamic";
import { ProgressList } from "../ProgressList";
import { useGraph } from "../../hooks/useGraph";

const ProgressListSkeleton = dynamic(
  () => import("../loaders/ProgressListSkeleton").then((mod) => mod.ProgressListSkeleton),
  { ssr: false }
);

export const Linear = ({ title, url, timeRange }) => {
  const { graph } = useGraph(url, timeRange);

  if (!graph) {
    return (
      <div className="px-4 py-8 flex items-center">
        <ProgressListSkeleton />
      </div>
    );
  }

  return <ProgressList title={title} data={graph} />;
};
