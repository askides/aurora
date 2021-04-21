import { ProgressList, LoadingPanel } from "../Primitives";
import { useGraph } from "../../hooks/useGraph";

const applyConfiguration = (data) => ({
  header: {
    columns: [
      { label: "Browser", accessor: "element", className: "col-span-2" },
      { label: "Views", accessor: "views", className: "col-span-1 text-right" },
      { label: "Unique", accessor: "unique", className: "col-span-1 text-right" },
    ],
  },
  body: {
    values: data,
  },
});

const BrowserViews = ({ url, timeRange }) => {
  const { graph, isLoading, isError } = useGraph(url, timeRange);

  if (isLoading) return <LoadingPanel />;
  if (isError) return <div>failed to load</div>;

  return <ProgressList configuration={applyConfiguration(graph)} />;
};

export default BrowserViews;
