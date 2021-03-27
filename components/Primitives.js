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
