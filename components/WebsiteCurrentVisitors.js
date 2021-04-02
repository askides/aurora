import useSWR from "swr";

const WebsiteCurrentVisitors = ({ seed }) => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR(`/api/metrics/${seed}/realtime/visitors`, fetcher, {
    refreshInterval: 2000,
  });

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <div className="flex items-center">
      <span className="mr-3 flex relative h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
      </span>
      <div className="text-white text-sm">Current Visitors: {data.visitors}</div>
    </div>
  );
};

export default WebsiteCurrentVisitors;
