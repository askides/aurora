import { Loader } from "../components/Icons";

export const Button = ({ type, block, value, isLoading, onClick }) => (
  <button
    type={type}
    disabled={isLoading}
    onClick={onClick}
    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-black dark:text-white bg-gray-200 dark:bg-gray-800 dark:focus:outline-none focus:outline-none focus:ring-2 focus:ring-offset-2 ring-offset-white dark:ring-offset-black focus:ring-gray-100 dark:focus:ring-gray-700 ${
      block ? "w-full justify-center" : null
    }`}
  >
    {isLoading ? <Loader /> : value}
  </button>
);

Button.defaultProps = {
  type: "button",
  block: false,
  value: "",
  isLoading: false,
  onClick: () => {},
};
