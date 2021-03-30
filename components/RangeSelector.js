const RangeSelector = ({ timeRange, onTimeRangeChange }) => (
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
);

export default RangeSelector;