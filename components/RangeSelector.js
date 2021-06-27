import { TimeRanges } from "../utils/enums";

export const RangeSelector = ({ onSelected }) => (
  <select
    onChange={(e) => onSelected(e.target.value)}
    className="text-black cursor-pointer dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-800 rounded-md bg-white dark:bg-black dark:placeholder-gray-500"
  >
    <option defaultValue={TimeRanges.DAY} value={TimeRanges.DAY}>
      Today
    </option>
    <option value={TimeRanges.WEEK}>This Week</option>
    <option value={TimeRanges.MONTH}>This Month</option>
    <option value={TimeRanges.YEAR}>This Year</option>
  </select>
);
