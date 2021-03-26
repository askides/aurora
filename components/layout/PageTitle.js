const PageTitle = ({ text, actions }) => (
  <div className="mb-4">
    <div className="mt-2 md:flex md:items-center md:justify-between">
      <div className="flex-1 min-w-0 space-y-2">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
          {text}
        </h2>
      </div>
      <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">{actions}</div>
    </div>
  </div>
);

export default PageTitle;
