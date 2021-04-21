import { Loader } from "../components/Icons";

export const Button = ({ type, value, isLoading, onClick }) => (
  <button
    type={type}
    disabled={isLoading}
    onClick={onClick}
    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  >
    {isLoading && <Loader />}
    {value}
  </button>
);

Button.defaultProps = {
  type: "button",
  value: "",
  isLoading: false,
  onClick: () => {},
};
