import { useField } from "formik";

export const TextField = ({ label, type, ...props }) => {
  const [field, meta] = useField(props);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="mt-1">
        <input
          {...field}
          type={type}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
      </div>

      {meta.error && meta.touched ? <div className="mt-2 text-sm text-red-600">{meta.error}</div> : null}
    </div>
  );
};
