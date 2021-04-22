import { useField } from "formik";

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

      {meta.touched && meta.error ? <div className="mt-2 text-sm text-red-600">{meta.error}</div> : null}
    </div>
  );
};
