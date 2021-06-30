import { useField } from "formik";

export const TextField = ({ label, type, placeholder, ...props }) => {
  const [field, meta] = useField(props);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-100">{label}</label>

      <div className="mt-1">
        <input
          {...field}
          type={type}
          placeholder={placeholder}
          className="text-black dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-800 rounded-md bg-white dark:bg-black dark:placeholder-gray-500"
        />
      </div>

      {meta.error && meta.touched ? (
        <div className="mt-2 text-sm text-red-600">{meta.error}</div>
      ) : null}
    </div>
  );
};
