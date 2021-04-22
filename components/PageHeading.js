import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";

export const PageHeading = ({ title, breadcumbs, actions }) => {
  return (
    <div>
      <div>
        <nav className="sm:hidden" aria-label="Back">
          <a href="#" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
            <ChevronLeftIcon className="flex-shrink-0 -ml-1 mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
            Back
          </a>
        </nav>
        <nav className="hidden sm:flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <div>
                <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-700">
                  Aurora
                </a>
              </div>
            </li>
            {breadcumbs.map((breadcumb, key) => (
              <li key={key}>
                <div className="flex items-center">
                  <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" aria-hidden="true" />
                  <a href="#" className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                    {breadcumb}
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="mt-2 md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">{title}</h2>
        </div>
        <div id="actions" className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4 space-x-3">
          {actions}
        </div>
      </div>
    </div>
  );
};

PageHeading.defaultProps = {
  title: "Please Insert Title.",
  breadcumbs: [],
  actions: undefined, // HELP: is this correct?
};
