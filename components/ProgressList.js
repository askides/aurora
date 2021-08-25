const ProgressListItem = ({ percentage, children }) => (
  <div className="space-y-3">
    {children}
    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-lg">
      <div className="rounded-lg bg-blue-500 h-1 sm:h-2" style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
);

export const ProgressList = (props) => (
  <div className="bg-white dark:bg-black overflow-hidden sm:first:pl-0 sm:pl-5 sm:py-5">
    <div className="space-y-7">
      <div className="text-black dark:text-white font-medium">
        <div className="grid grid-cols-4 text-black dark:text-white text-sm">
          <div className="col-span-2 truncate">{props.title}</div>
          <div className="col-span-1 text-right">Views</div>
          <div className="col-span-1 text-right">Unique</div>
        </div>
      </div>
      <div className="space-y-5">
        {props.data.length ? (
          props.data.map((row, rowKey) => (
            <div key={rowKey} className="space-y-3">
              <ProgressListItem percentage={row.percentage}>
                <div className="grid grid-cols-4 text-black dark:text-white text-sm">
                  <div className="col-span-2 truncate">{row.element}</div>
                  <div className="col-span-1 text-right">{row.views}</div>
                  <div className="col-span-1 text-right">{row.unique}</div>
                </div>
              </ProgressListItem>
            </div>
          ))
        ) : (
          <div className="text-sm text-black dark:text-white">No Data Available</div>
        )}
      </div>
    </div>
  </div>
);
