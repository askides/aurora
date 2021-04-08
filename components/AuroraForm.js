import Link from "next/link";
import { useField } from "formik";

export const SvgLoader = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

export const Button = ({ label, type, isLoading, href }) => {
  if (href) {
    return (
      <Link href={href}>
        <a className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500">
          {label}
        </a>
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={isLoading}
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
    >
      {isLoading && <SvgLoader />}
      {label}
    </button>
  );
};

export const TextField = ({ label, type, ...props }) => {
  const [field, meta] = useField(props);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-white">{label}</label>
      <div className="mt-1">
        <input
          {...field}
          type={type}
          className="appearance-none block w-full px-3 py-2 dark:text-white border ring-1 ring-gray-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 dark:focus:ring-blue-500 focus:border-indigo-500 dark:focus:border-blue-500 sm:text-sm"
        />
      </div>
      {meta.error && meta.touched ? (
        <div className="mt-2 text-sm text-red-600">{meta.error}</div>
      ) : null}
    </div>
  );
};

export const Select = ({ label, allowEmpty = true, options = [], ...props }) => {
  const [field, meta] = useField(props);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-white">{label}</label>

      <select
        {...field}
        {...props}
        className="mt-1 block w-full dark:text-white bg-white border border-gray-300 dark:border-gray-600 dark:bg-gray-700 ring-1 ring-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-gray-900 focus:border-gray-900 sm:text-sm focus:outline-none focus:ring-indigo-500 dark:focus:ring-blue-500 focus:border-indigo-500 dark:focus:border-blue-500"
      >
        {allowEmpty && <option>Select..</option>}
        {options.map((option, key) => (
          <option key={key} value={option.id}>
            {option.value}
          </option>
        ))}
      </select>

      {meta.touched && meta.error ? (
        <div className="mt-2 text-sm text-red-600">{meta.error}</div>
      ) : null}
    </div>
  );
};
