import { useRouter } from "next/router";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";

export const PageHeading = ({ title, subtitle, breadcumbs, actions, EXPERIMENTAL_IS_DARK }) => {
  const router = useRouter();

  return (
    <div className="md:flex md:items-center md:justify-between">
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate text-black dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <div className="pt-2 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
            {subtitle}
          </div>
        )}
      </div>
      <div id="actions" className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4 space-x-3">
        {actions}
      </div>
    </div>
  );
};

PageHeading.defaultProps = {
  title: "Please Insert Title.",
  subtitle: undefined,
  breadcumbs: [],
  actions: undefined, // HELP: is this correct?
};
