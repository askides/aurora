import { Panel } from "./Panel";

const ProgressListItem = ({ percentage, children }) => (
  <div className="space-y-3">
    {children}
    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-lg">
      <div className="rounded-lg bg-blue-500 h-1 sm:h-2" style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
);

export const ProgressList = ({ configuration = {} }) => (
  <Panel>
    <div className="space-y-7">
      <div className="text-black dark:text-white font-medium">
        <div className="grid grid-cols-4 text-black dark:text-white text-sm">
          {configuration.header &&
            configuration.header.columns.map((column, columnKey) => (
              <div key={columnKey} className={column.className}>
                {column.label}
              </div>
            ))}
        </div>
      </div>
      <div className="space-y-5">
        {configuration.body && configuration.body.values.length ? (
          configuration.body.values.map((row, rowKey) => (
            <div key={rowKey} className="space-y-3">
              <ProgressListItem percentage={row.percentage}>
                <div className="grid grid-cols-4 text-black dark:text-white text-sm">
                  {configuration.header &&
                    configuration.header.columns.map((rowColumn, rowColumnKey) => (
                      <div key={rowColumnKey} className={rowColumn.className}>
                        {row[rowColumn.accessor]}
                      </div>
                    ))}
                </div>
              </ProgressListItem>
            </div>
          ))
        ) : (
          <div className="text-sm text-black dark:text-white">No Data Available</div>
        )}
      </div>
    </div>
  </Panel>
);
