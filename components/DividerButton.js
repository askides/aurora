import { default as NextLink } from "next/link";
import { PlusSmIcon } from "@heroicons/react/solid";

export const DividerButton = ({ link }) => (
  <div className="relative w-full">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t border-gray-200 dark:border-gray-800" />
    </div>
    <div className="relative flex justify-center">
      <NextLink href={link}>
        <a className="inline-flex items-center shadow-sm px-4 py-1.5 border border-gray-200 dark:border-gray-800 text-sm leading-5 font-medium rounded-full text-black dark:text-white bg-gray-200 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 ring-offset-white dark:ring-offset-black focus:ring-gray-100 dark:focus:ring-gray-700">
          <PlusSmIcon className="-ml-1.5 mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
          <span>Create New</span>
        </a>
      </NextLink>
    </div>
  </div>
);
