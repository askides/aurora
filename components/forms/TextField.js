import { useField } from "formik";

const TextField = ({ label, type, ...props }) => {
  const [field, meta] = useField(props);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">
        <input
          {...field}
          type={type}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      {meta.error && meta.touched ? <div>{meta.error}</div> : null}
    </div>
  );
};

export default TextField;
