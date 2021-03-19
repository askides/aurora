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
    <nav class="space-y-1" aria-label="Sidebar">
      <h3
        class="text-xs font-semibold text-gray-500 uppercase tracking-wider"
        id="projects-headline">
        Pages
      </h3>
      {/* Current: "bg-gray-200 text-gray-900", Default: "text-gray-600 hover:bg-gray-50 hover:text-gray-900" */}
      {data.map((el, key) => (
        <a
          href="#"
          class="bg-gray-100 text-gray-900 group flex items-center py-2 text-sm font-medium rounded-md"
          aria-current="page">
          <span class="truncate">{el.element}</span>

          {/* Current: "bg-white", Default: "bg-gray-100 group-hover:bg-gray-200" */}
          <span class="bg-white ml-auto inline-block py-0.5 px-3 text-xs rounded-full">
            {el.views}
          </span>
        </a>
      ))}
    </nav>
  );
};

export default ListView;
