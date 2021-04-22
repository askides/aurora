export const Panel = ({ header, isLoading, children }) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
      {header && <div className="px-4 py-5 sm:px-6">{header}</div>}
      <div className="px-4 py-5 sm:p-6">{children}</div>
    </div>
  );
};

Panel.defaultProps = {
  header: undefined, // HELP: is this correct?
  isLoading: false,
};

export const LoadingPanel = () => (
  <Panel>
    <div className="flex justify-center items-center">
      <img className="h-32" src="/icons/rings.svg" />
    </div>
  </Panel>
);
