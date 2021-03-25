import useSWR from "swr";
import CountUp from "react-countup";

const Stats = ({ timeRange }) => {
  const fetcher = (...args) => {
    const [url, params] = args;

    return fetch(`${url}?range=${params.range}`)
      .then((res) => res.json())
      .then((res) => res.data);
  };

  const { data, error } = useSWR(["/api/metrics/performance", timeRange], (url, range) =>
    fetcher(url, { range })
  );

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <div>
      <dl className="grid grid-cols-1 rounded-lg bg-white overflow-hidden shadow divide-y divide-gray-200 dark:divide-gray-700 md:grid-cols-3 md:divide-y-0 md:divide-x dark:bg-gray-800">
        <div className="px-4 py-5 sm:p-6">
          <dt className="text-base font-normal text-gray-900 dark:text-green-400">Total Views</dt>
          <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
            <div className="flex items-baseline text-2xl font-semibold text-indigo-600 dark:text-white">
              <CountUp end={data.pageViews.cp} />
              <span className="ml-2 text-sm font-medium text-gray-500">
                from <CountUp end={data.pageViews.lp} />
              </span>
            </div>

            <div className="inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 dark:bg-gray-700 text-green-800 dark:text-green-500 md:mt-2 lg:mt-0">
              <svg
                className="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="sr-only">Increased by</span>
              <CountUp end={data.pageViews.inc} />%
            </div>
          </dd>
        </div>

        <div className="px-4 py-5 sm:p-6">
          <dt className="text-base font-normal text-gray-900 dark:text-green-400">
            Unique Visitors
          </dt>
          <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
            <div className="flex items-baseline text-2xl font-semibold text-indigo-600 dark:text-white">
              <CountUp end={data.uniqueVisitors.cp} />
              <span className="ml-2 text-sm font-medium text-gray-500">
                from <CountUp end={data.uniqueVisitors.lp} />
              </span>
            </div>

            <div className="inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 dark:bg-gray-700 text-green-800 dark:text-green-500 md:mt-2 lg:mt-0">
              <svg
                className="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="sr-only">Increased by</span>
              <CountUp end={data.uniqueVisitors.inc} />%
            </div>
          </dd>
        </div>

        <div className="px-4 py-5 sm:p-6">
          <dt className="text-base font-normal text-gray-900 dark:text-green-400">Bounce Rate</dt>
          <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
            <div className="flex items-baseline text-2xl font-semibold text-indigo-600 dark:text-white">
              <CountUp end={data.bounceRate.cp} />%
              <span className="ml-2 text-sm font-medium text-gray-500">
                from <CountUp end={data.bounceRate.lp} />%
              </span>
            </div>

            <div className="inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 dark:bg-gray-700 text-red-800 dark:text-red-500 md:mt-2 lg:mt-0">
              <svg
                className="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="sr-only">Decreased by</span>
              <CountUp end={data.bounceRate.inc} />%
            </div>
          </dd>
        </div>
      </dl>
    </div>
  );
};

export default Stats;
