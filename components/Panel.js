export const Panel = ({ header, isLoading, children }) => {
  return (
    <div className="bg-white dark:bg-gray-900 overflow-hidden sm:first:pl-0 sm:pl-5 sm:py-5">
      {header && <div className="px-4 py-5 sm:px-6">{header}</div>}
      <div className="">{children}</div>
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
