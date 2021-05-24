import dynamic from "next/dynamic";
import { ProgressList } from "../ProgressList";
import { useGraph } from "../../hooks/useGraph";

const applyConfiguration = (title, data) => ({
  header: {
    columns: [
      { label: title, accessor: "element", className: "col-span-2 truncate" },
      { label: "Views", accessor: "views", className: "col-span-1 text-right" },
      { label: "Unique", accessor: "unique", className: "col-span-1 text-right" },
    ],
  },
  body: {
    values: data,
  },
});

const Loader = dynamic(() => import("../Loader").then((mod) => mod.Loader), { ssr: false });

export const Linear = ({ title, url, timeRange }) => {
  const { graph, isLoading, isError } = useGraph(url, timeRange);

  if (isLoading) return <Loader width={340} height={548} />;
  if (isError) return <div>failed to load</div>;

  return <ProgressList configuration={applyConfiguration(title, graph)} />;
};
