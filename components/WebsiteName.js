import { useWebsite } from "./hooks/useWebsite";
import { dropProtocol } from "../utils/urls";

const WebsiteName = ({ seed }) => {
  const { website, isLoading, isError } = useWebsite({ seed });

  if (isLoading) return <LoadingPanel />;
  if (isError) return <div>failed to load</div>;

  return (
    <h2 className="text-2xl tracking-tight font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
      {dropProtocol(website.url)}
    </h2>
  );
};

export default WebsiteName;
