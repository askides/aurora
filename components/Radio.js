import { useField } from "formik";

export const Radio = ({ label, value, ...props }) => {
  const [field, meta] = useField(props);

  const isSelected = (v) => v == meta.value;

  return (
    <div className="flex items-center">
      <input
        {...field}
        checked={isSelected(value)}
        value={value}
        type="radio"
        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:bg-black"
      />

      <label className="ml-3 block text-sm font-medium text-gray-600 dark:text-gray-100">
        {label}
      </label>

      {meta.error && meta.touched ? (
        <div className="mt-2 text-sm text-red-600">{meta.error}</div>
      ) : null}
    </div>
  );
};
