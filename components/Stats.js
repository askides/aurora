import CountUp from "react-countup";
import { ArrowSmDownIcon, ArrowSmUpIcon } from "@heroicons/react/solid";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const Stats = ({ stats }) => {
  return (
    <div>
      <dl className="mt-5 grid grid-cols-1 rounded-lg bg-white overflow-hidden shadow divide-y divide-gray-200 md:grid-cols-3 md:divide-y-0 md:divide-x dark:divide-gray-800 dark:bg-gray-800">
        {stats.map((item) => (
          <div key={item.name} className="px-4 py-5 sm:p-6">
            <dt className="text-base font-normal text-gray-900 dark:text-white">{item.name}</dt>
            <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
              <div className="flex items-baseline text-2xl font-semibold text-blue-600 dark:text-white">
                <CountUp end={item.stat} />
                <span className="ml-2 text-sm font-medium text-gray-500">
                  from <CountUp end={item.previousStat} />
                </span>
              </div>

              <div
                className={classNames(
                  item.changeType === "increase"
                    ? "bg-green-100 text-green-800 dark:text-green-500"
                    : "bg-red-100 text-red-800 dark:text-red-500",
                  "inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium md:mt-2 lg:mt-0 dark:bg-gray-700"
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

                <span className="sr-only">{item.changeType === "increase" ? "Increased" : "Decreased"} by</span>
                <CountUp end={item.change} />
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
