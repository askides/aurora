import { ArrowSmDownIcon, ArrowSmUpIcon } from "@heroicons/react/solid";
import { classNames } from "../../utils/classes";

const item = {
  changeType: "increase", // TODO: need real data
};

export const Jumbo = ({ title, value }) => (
  <div className="px-0 py-0 bg-white dark:bg-black overflow-hidden sm:first:pl-0 sm:pl-5 sm:py-5">
    <dt className="text-md font-medium text-gray-500 truncate flex justify-between">
      <div>{title}</div>

      {/* <div
        className={classNames(
          item.changeType === "increase"
            ? "text-green-800 dark:text-green-500"
            : "text-red-800 dark:text-red-500",
          "inline-flex items-baseline rounded-full text-lg font-bold md:mt-2 lg:mt-0 dark:bg-transparent"
        )}
      >
        {item.changeType === "increase" ? (
          <ArrowSmUpIcon
            className="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-green-500"
            aria-hidden="true"
          />
        ) : (
          <ArrowSmDownIcon
            className="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-red-500"
            aria-hidden="true"
          />
        )}
        12
      </div> */}
    </dt>
    <dd className="mt-1 text-5xl font-semibold text-black dark:text-white">{value}</dd>
  </div>
);

Jumbo.defaultProps = {
  title: "Insert Title",
  value: "0",
};
