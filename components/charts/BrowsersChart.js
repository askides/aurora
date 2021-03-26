const BrowsersChart = () => (
  <div className="bg-white dark:bg-gray-800 w-full overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
    <div className="px-4 py-5 sm:px-6">
      <div className="-ml-4 -mt-4 flex justify-between items-center flex-wrap sm:flex-nowrap">
        <div className="ml-4 mt-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-green-400">
            GODONE
          </h3>
        </div>
        <div className="ml-4 mt-4 flex-shrink-0"></div>
      </div>
    </div>
    <div className="px-4 py-5 sm:p-6 space-y-4">
      <div className="flex text-white items-center">
        <div className="mr-4 flex-shrink-0 self-center">
          <img
            className="inline-block h-14 w-14 rounded-full"
            src="https://cdn.worldvectorlogo.com/logos/chrome-7.svg"
            alt=""
          />
        </div>
        <div className="space-y-3">
          <h4 className="text-lg font-bold leading-5">Google Chrome</h4>
          <p className="mt-1">
            <div className="w-6/12 mt-2 bg-green-600 py-1 rounded-full"></div>
          </p>
        </div>
      </div>

      <div className="flex text-white items-center">
        <div className="mr-4 flex-shrink-0 self-center">
          <img
            className="inline-block h-14 w-14 rounded-full"
            src="https://cdn.worldvectorlogo.com/logos/firefox-3.svg"
            alt=""
          />
        </div>
        <div className="space-y-3">
          <h4 className="text-lg font-bold leading-5">Firefox</h4>
          <p className="mt-1">
            <div className="w-6/12 mt-2 bg-green-600 py-1 rounded-full"></div>
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default BrowsersChart;
