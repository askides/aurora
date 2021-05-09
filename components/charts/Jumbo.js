export const Jumbo = ({ title, value }) => (
  <div className="px-0 py-0 bg-white dark:bg-transparent overflow-hidden sm:first:pl-0 sm:pl-5 sm:py-5">
    <dt className="text-md font-medium text-gray-500 truncate">{title}</dt>
    <dd className="mt-1 text-5xl font-semibold text-white">{value}</dd>
  </div>
);

Jumbo.defaultProps = {
  title: "Insert Title",
  value: "0",
};
