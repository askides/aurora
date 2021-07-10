export const Jumbo = ({ title, value, isLoading }) => (
  <div className="px-0 py-0 bg-white dark:bg-black overflow-hidden sm:first:pl-0 sm:pl-5 sm:py-5">
    <dt className="text-md font-medium text-gray-500 truncate flex justify-between">
      <div>{title}</div>
    </dt>
    <dd className="mt-1 text-5xl font-semibold text-black dark:text-white">
      {isLoading ? "_" : value}
    </dd>
  </div>
);
