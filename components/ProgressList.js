import ContentLoader from "react-content-loader";
import { Panel } from "./Panel";

const ProgressListItem = ({ percentage, children }) => (
  <div className="space-y-3">
    {children}
    <div className="w-full bg-gray-800 rounded-lg">
      <div className="rounded-lg bg-blue-500 h-1 sm:h-2" style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
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
        {configuration.body && configuration.body.values.length ? (
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
          ))
        ) : (
          <div className="text-sm text-white">No Data Available</div>
        )}
      </div>
    </div>
  </Panel>
);

export const Loader = (props) => (
  <div className="flex justify-center">
    <ContentLoader
      speed={2}
      width={340}
      height={548}
      viewBox="0 0 340 84"
      // backgroundColor="#111827"
      backgroundColor="#1f2937"
      // foregroundColor="#294662"
      foregroundColor="#088ffb"
      {...props}
    >
      <rect x="0" y="0" rx="3" ry="3" width="67" height="11" />
      <rect x="76" y="0" rx="3" ry="3" width="140" height="11" />
      <rect x="127" y="48" rx="3" ry="3" width="53" height="11" />
      <rect x="187" y="48" rx="3" ry="3" width="72" height="11" />
      <rect x="18" y="48" rx="3" ry="3" width="100" height="11" />
      <rect x="0" y="71" rx="3" ry="3" width="37" height="11" />
      <rect x="18" y="23" rx="3" ry="3" width="140" height="11" />
      <rect x="166" y="23" rx="3" ry="3" width="173" height="11" />
    </ContentLoader>
  </div>
);
