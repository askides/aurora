import React, { useEffect } from "react";
import { useTable, useFilters, useAsyncDebounce, usePagination } from "react-table";

export const HeadlessTable = ({ data = [], columns = [], onFetchData }) => {
  const isOdd = (num) => num % 2;

  const defaultColumn = React.useMemo(
    () => ({
      // Let's set up our default Filter UI
      Filter: DefaultColumnFilter,
    }),
    []
  );

  function DefaultColumnFilter({ column: { filterValue, preFilteredRows, setFilter } }) {
    const count = preFilteredRows.length;

    return (
      <input
        type="text"
        value={filterValue || ""}
        onChange={(e) => {
          setFilter(e.target.value || undefined); // Set undefined to remove the filter entirely
        }}
        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md mt-2"
        placeholder={`Search ${count} records...`}
      />
    );
  }

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    // rows,
    prepareRow,
    page, // Instead of using 'rows', we'll use page,
    // which has only the rows for the active page

    // The rest of these things are super handy, too ;)
    canPreviousPage,
    canNextPage,
    pageOptions,
    nextPage,
    previousPage,
    state: { pageIndex, pageSize, sortBy, filters },
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      initialState: { pageSize: 12 },
    },
    useFilters,
    usePagination
  );

  const onFetchDataDebounced = useAsyncDebounce(onFetchData, 500);

  useEffect(() => {
    onFetchDataDebounced({ pageIndex, pageSize, sortBy, filters });
  }, [onFetchDataDebounced, pageIndex, pageSize, sortBy, filters]);

  return (
    <div className="sm:shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
      <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
        <thead className="sm:bg-gray-50">
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th
                  {...column.getHeaderProps()}
                  scope="col"
                  className={`px-4 py-4 sm:px-5 sm:py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.id == "delete" ? "text-right" : "text-left"
                  }`}
                >
                  {column.render("Header")}
                  <div>{column.canFilter ? column.render("Filter") : null}</div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()} className={isOdd(row.index) ? "bg-gray-50" : "bg-white"}>
                {row.cells.map((cell, index) => {
                  return (
                    <td
                      {...cell.getCellProps()}
                      className={`px-4 py-4 sm:px-6 sm:py-3 whitespace-nowrap text-sm ${
                        index < 1 ? "font-medium text-gray-900" : "text-gray-500"
                      } ${cell.column.id == "delete" ? "text-right" : ""}`}
                    >
                      {cell.render("Cell")}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <nav
        className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
        aria-label="Pagination"
      >
        <div className="hidden sm:block">
          <p className="text-sm text-gray-700">
            Page
            <span className="font-medium">&nbsp;{pageIndex + 1}&nbsp;</span>
            of
            <span className="font-medium">&nbsp;{pageOptions.length}</span>
          </p>
        </div>
        <div className="flex-1 flex justify-between sm:justify-end">
          <button
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
            className="relative inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Previous
          </button>
          <button
            onClick={() => nextPage()}
            disabled={!canNextPage}
            className="ml-3 relative inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  );
};
