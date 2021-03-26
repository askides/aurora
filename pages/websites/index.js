import useSWR from "swr";
import Link from "next/link";
import PageTitle from "../../components/layout/PageTitle";
import { Button } from "../../components/AuroraForm";
import { Panel, StackedList, StackedListItem } from "../../components/Primitives";

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

      <Panel>
        <StackedList>
          {data.map((el, key) => (
            <StackedListItem
              key={key}
              avatar={`https://avatars.dicebear.com/api/jdenticon/${el.url}.svg`}
              title={
                <Link href={`/websites/${el.seed}/edit`}>
                  <a>Nome da mettere</a>
                </Link>
              }
              subtitle={el.url}
            />
          ))}
        </StackedList>
      </Panel>
    </div>
  );
};

export default Websites;
