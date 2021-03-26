import useSWR from "swr";
import Link from "next/link";
import PageTitle from "../../components/layout/PageTitle";
import { Button } from "../../components/AuroraForm";

const Websites = () => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR("/api/me/websites", fetcher);

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <div className="h-full rounded-lg space-y-4 bg-gray-900">
      <PageTitle text="Websites" actions={<Button href="/websites/create" label="Create New" />} />

      <ul class="divide-y divide-gray-200 dark:divide-gray-700">
        {data.map((el, key) => (
          <li key={key} class="py-4 flex">
            <img
              class="h-10 w-10 rounded-full"
              src={`https://avatars.dicebear.com/api/jdenticon/${el.url}.svg`}
              alt=""
            />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                <Link href={`/websites/${el.seed}/edit`}>
                  <a>Nome da mettere</a>
                </Link>
              </p>
              <p class="text-sm text-gray-500 dark:text-white">{el.url}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Websites;
