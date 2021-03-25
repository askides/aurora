import useSWR from "swr";
import AdminPageHeader from "../../components/AdminPageHeader";
import HeadlessTable from "../../components/HeadlessTable";
import Header from "../../components/layout/Header";
import PageHeader from "../../components/PageHeader";

const Websites = () => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR("/api/me/websites", fetcher);

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  const columns = [
    {
      Header: "ID",
      accessor: "id",
      Cell: ({ cell, value }) => (
        <div className="flex items-center justify-between space-x-3">
          <div className="flex items-center truncate space-x-3">
            <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-pink-600"></div>
            <a href={`/websites/${cell.row.original.id}/edit`} className="">
              {value}
            </a>
          </div>

          <svg
            className="block sm:hidden ml-4 h-5 w-5 text-gray-400 group-hover:text-gray-500 group-focus:text-gray-600 transition ease-in-out duration-150"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor">
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"></path>
          </svg>
        </div>
      ),
    },
    { Header: "URL", accessor: "url" },
    { Header: "Last Updated", accessor: "updated_at", disableFilters: false },
  ];

  return (
    <>
      <Header />
      <AdminPageHeader text="Websites" />
      <HeadlessTable
        data={data}
        columns={columns}
        onFetchData={({ filters }) => console.log("fedt", filters)}
      />
    </>
  );
};

export default Websites;
