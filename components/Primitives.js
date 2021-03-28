export const Panel = ({ header, children }) => (
  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
    {header && <div className="px-4 py-5 sm:px-6">{header}</div>}
    <div className="px-4 py-5 sm:p-6">{children}</div>
  </div>
);

export const StackedList = ({ children }) => (
  <ul className="divide-y divide-gray-200 dark:divide-gray-700">{children}</ul>
);

export const StackedListItem = ({ avatar, title, subtitle, actions }) => (
  <li className="py-4 first:pt-0 last:pb-0">
    <div className="flex items-center space-x-4">
      <div className="flex-shrink-0">
        <img className="h-8 w-8 rounded-full" src={avatar} alt="" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-300 truncate">{subtitle}</p>
      </div>
      {actions}
    </div>
  </li>
);

export const ProgressList = ({ configuration = {} }) => (
  <Panel>
    <div className="space-y-7">
      <div className="text-white font-medium">
        <div className="grid grid-cols-4 text-white text-sm">
          {configuration.header &&
            configuration.header.columns.map((column, columnKey) => (
              <div key={columnKey} className={column.className}>
                {column.label}
              </div>
            ))}
        </div>
      </div>
      <div className="space-y-5">
        {configuration.body &&
          configuration.body.values.map((row, rowKey) => (
            <div key={rowKey} className="space-y-3">
              <ProgressListItem percentage={row.percentage}>
                <div className="grid grid-cols-4 text-white text-sm">
                  {configuration.header &&
                    configuration.header.columns.map((rowColumn, rowColumnKey) => (
                      <div key={rowColumnKey} className={rowColumn.className}>
                        {row[rowColumn.accessor]}
                      </div>
                    ))}
                </div>
              </ProgressListItem>
            </div>
          ))}
      </div>
    </div>
  </Panel>
);

export const ProgressListItem = ({ percentage, children }) => (
  <div className="space-y-3">
    {children}
    <div className="w-full bg-gray-900 rounded-lg">
      <div className="rounded-lg bg-blue-500 h-1 sm:h-2" style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
);

export const Stats = ({ children }) => (
  <dl className="grid grid-cols-1 rounded-lg bg-white overflow-hidden shadow divide-y divide-gray-200 dark:divide-gray-700 md:grid-cols-3 md:divide-y-0 md:divide-x dark:bg-gray-800">
    {children}
  </dl>
);

export const StatsItem = ({ title, currentValue, previousValue, increment }) => (
  <div className="px-4 py-5 sm:p-6">
    <dt className="text-base font-normal text-gray-900 dark:text-green-400">{title}</dt>
    <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
      <div className="flex items-baseline text-2xl font-semibold text-indigo-600 dark:text-white">
        {currentValue}
        <span className="ml-2 text-sm font-medium text-gray-500">from {previousValue}</span>
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
        {increment}
      </div>
    </dd>
  </div>
);
