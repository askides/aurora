import { HeadlessTable } from "../components/HeadlessTable";
import { PageHeading } from "../components/PageHeading";
import { Link } from "../components/Link";
import { useMeWebsites } from "../hooks/useMeWebsites";
import { withAuth } from "../hoc/withAuth";

const columns = [
  {
    Header: "Name",
    accessor: "name",
    Cell: ({ cell, value }) => (
      <div className="flex items-center justify-between space-x-3">
        <div className="flex items-center truncate space-x-3">
          <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-pink-600"></div>
          <a href={`/websites/${cell.row.original.seed}/edit`}>{value}</a>
        </div>

        <svg
          className="block sm:hidden ml-4 h-5 w-5 text-gray-400 group-hover:text-gray-500 group-focus:text-gray-600 transition ease-in-out duration-150"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          ></path>
        </svg>
      </div>
    ),
  },
  { Header: "Url", accessor: "url" },
  { Header: "Shared", accessor: (row) => (row.shared ? "Yes" : "No") },
  {
    id: "actions",
    Cell: ({ cell }) => (
      <div className="flex items-center justify-end space-x-3 font-medium text-blue-600 text-right">
        <a href={`/websites/${cell.row.original.seed}`}>View Dashboard</a>
      </div>
    ),
  },
];

const Websites = () => {
  const { websites, isLoading, isError } = useMeWebsites();

  const breadcumbs = ["Websites", "List"];

  if (isLoading) return <div>Loading..</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <div className="p-6 h-full">
      <PageHeading
        title={"Websites"}
        breadcumbs={breadcumbs}
        actions={<Link value="Create New" href="/websites/create" />}
      />

      <div className="mt-8">
        <HeadlessTable data={websites} columns={columns} onFetchData={() => {}} />
      </div>
    </div>
  );
};

export default withAuth(Websites);
