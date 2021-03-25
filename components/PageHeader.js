import useSWR from "swr";

const PageHeader = ({ timeRange, onTimeRangeChange }) => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR("/api/metrics/realtime/visitors", fetcher);

  return (
    <div className="pt-10">
      <div className="mt-2 md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0 space-y-2">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            animesplash.tv
          </h2>
          <div className="flex items-center">
            <span className="mr-3 flex relative h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <div className="text-white text-sm">
              Current Visitors: {!error && data ? data.visitors : 0}
            </div>
          </div>
        </div>
        <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base dark:text-white cursor-pointer font-medium border-gray-300 dark:border-gray-800 dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 dark:focus:ring-green-500 focus:border-indigo-500 dark:focus:border-green-500 sm:text-sm rounded-md">
            <option defaultValue="this_day" value="this_day">
              Today
            </option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_year">This Year</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
