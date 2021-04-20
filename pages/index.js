import { HeadlessTable } from "../components/HeadlessTable";
import { PageHeading } from "../components/PageHeading";
import { Button } from "../components/Button";
import { useWebsites } from "../hooks/useWebsites";
import { withAuth } from "../hoc/withAuth";

const columns = [
  {
    Header: "Name",
    accessor: "name",
    Cell: ({ cell, value }) => (
      <div className="flex items-center justify-between space-x-3">
        <div className="flex items-center truncate space-x-3">
          <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-pink-600"></div>
          <a href={`/websites/${cell.row.original.seed}/edit`} className="">
            {value}
          </a>
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
  { Header: "Last Updated", accessor: "updated_at", disableFilters: false },
];

const Websites = () => {
  const { websites, isLoading, isError } = useWebsites();

  const breadcumbs = ["Websites", "List"];

  if (isLoading) return <div>Loading..</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <div>
      <PageHeading
        title={"Websites"}
        breadcumbs={breadcumbs}
        actions={<Button value="Create New" onClick={() => alert("Click")} />}
      />

      <div className="mt-8">
        <HeadlessTable data={websites} columns={columns} onFetchData={() => {}} />
      </div>
    </div>
  );
};

export default withAuth(Websites);
