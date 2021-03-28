import { ProgressList } from "../Primitives";

const BrowserViews = () => {
  const configuration = {
    header: {
      columns: [
        { label: "Page Visits", accessor: "page", className: "col-span-2" },
        { label: "Visitors", accessor: "visitors", className: "col-span-1 text-right" },
        { label: "Unique", accessor: "unique", className: "col-span-1 text-right" },
      ],
    },
    body: {
      values: [
        {
          page: "Orange",
          visitors: 7997,
          unique: 267,
          percentage: 14,
        },
        {
          page: "Violet",
          visitors: 9461,
          unique: 177,
          percentage: 67,
        },
      ],
    },
  };

  return <ProgressList configuration={configuration} />;
};

export default BrowserViews;
