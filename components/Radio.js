export const Radio = ({ register, name, ...rest }) => {
  return (
    <div className="flex items-center">
      <input
        {...register(name)}
        {...rest}
        type="radio"
        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:bg-black"
      />

      <label className="ml-3 block text-sm font-medium text-gray-600 dark:text-gray-100">
        {rest.label}
      </label>
    </div>
  );
};
