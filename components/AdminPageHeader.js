const AdminPageHeader = ({ text, actions }) => (
  <div className="pt-10 mb-4">
    <div className="mt-2 md:flex md:items-center md:justify-between">
      <div className="flex-1 min-w-0 space-y-2">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
          {text}
        </h2>
      </div>
      <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500">
          Create New
        </button>
      </div>
    </div>
  </div>
);

export default AdminPageHeader;
