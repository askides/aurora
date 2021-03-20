import useSWR from "swr";

const ListView = () => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR("/api/metrics/page-views", fetcher);

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <div class="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Most Viewed Pages
        </h3>
      </div>
      <div class="px-4 py-5 sm:p-6">
        <div class="space-y-3">
          {data.map((el, key) => (
            <div class="text-black group flex items-center text-sm">
              <span class="truncate">{el.element}</span>

              <span class="ml-auto inline-block font-medium">{el.views}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListView;
