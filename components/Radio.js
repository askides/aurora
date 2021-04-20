import { useField } from "formik";

export const Radio = ({ label, value, ...props }) => {
  const [field, meta] = useField(props);

  return (
    <div className="flex items-center">
      <input
        {...field}
        value={value}
        type="radio"
        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
      />

      <label className="ml-3 block text-sm font-medium text-gray-700">{label}</label>

      {meta.error && meta.touched ? <div className="mt-2 text-sm text-red-600">{meta.error}</div> : null}
    </div>
  );
};
