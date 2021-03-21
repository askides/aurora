const PageHeader = () => {
  return (
    <div className="mb-10">
      <div>
        <nav class="sm:hidden" aria-label="Back">
          <a
            href="#"
            class="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
            <svg
              class="flex-shrink-0 -ml-1 mr-1 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            Back
          </a>
        </nav>
        <nav class="hidden sm:flex" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-4">
            <li>
              <div>
                <a href="#" class="text-sm font-medium text-gray-500 hover:text-gray-700">
                  Aurora
                </a>
              </div>
            </li>
            <li>
              <div class="flex items-center">
                <svg
                  class="flex-shrink-0 h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                <a href="#" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Tracking
                </a>
              </div>
            </li>
            <li>
              <div class="flex items-center">
                <svg
                  class="flex-shrink-0 h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                <a
                  href="#"
                  aria-current="page"
                  class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                  animesplash.tv
                </a>
              </div>
            </li>
          </ol>
        </nav>
      </div>
      <div class="mt-2 md:flex md:items-center md:justify-between">
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            animesplash.tv
          </h2>
        </div>
        <div class="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
          <select
            //value={timeRange}
            //onChange={(e) => setTimeRange(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option defaultValue="this_day" value="this_day">
              Today
            </option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_year">This Year</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
