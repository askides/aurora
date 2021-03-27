export const Panel = ({ header, children }) => (
  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
    {header && <div className="px-4 py-5 sm:px-6">{header}</div>}
    <div className="px-4 py-5 sm:p-6">{children}</div>
  </div>
);

export const StackedList = ({ children }) => (
  <ul className="divide-y divide-gray-200 dark:divide-gray-700">{children}</ul>
);

export const StackedListItem = ({ avatar, title, subtitle }) => (
  <li className="pt-4 pb-4 first:pt-0 last:pb-0 flex">
    <img className="h-10 w-10 rounded-full" src={avatar} alt="" />
    <div className="ml-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">{subtitle}</p>
    </div>
  </li>
);
