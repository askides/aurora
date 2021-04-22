import { TimeRanges } from "../utils/enums";

export const RangeSelector = ({ onSelected }) => (
  <select
    onChange={(e) => onSelected(e.target.value)}
    className="mt-1 block w-full pl-3 pr-10 py-2 text-base dark:text-white cursor-pointer font-medium border-gray-300 dark:border-gray-800 dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 dark:focus:ring-green-500 focus:border-indigo-500 dark:focus:border-green-500 sm:text-sm rounded-md"
  >
    <option defaultValue={TimeRanges.DAY} value={TimeRanges.DAY}>
      Today
    </option>
    <option value={TimeRanges.WEEK}>This Week</option>
    <option value={TimeRanges.MONTH}>This Month</option>
    <option value={TimeRanges.YEAR}>This Year</option>
  </select>
);
