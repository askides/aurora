import useSWR from "swr";

const ListView = ({ url }) => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR(url, fetcher);

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-green-400 uppercase tracking-wider">
          Most Viewed Pages
        </h3>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <div className="space-y-3">
          {data.map((el, key) => (
            <div key={key} className="text-black dark:text-white group flex items-center text-sm">
              <span className="truncate">{el.element}</span>

              <span className="ml-auto inline-block font-medium">{el.views}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListView;
