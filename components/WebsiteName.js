import useSWR from "swr";
import clean from "../utils/url-cleaner";

const WebsiteName = ({ seed }) => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR(`/api/me/websites/${seed}`, fetcher);

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <h2 className="text-2xl tracking-tight font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
      {clean(data.url)}
    </h2>
  );
};

export default WebsiteName;
