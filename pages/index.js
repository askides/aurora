import useSWR from "swr";
import Link from "next/link";
import PageTitle from "../components/layout/PageTitle";
import { Button } from "../components/AuroraForm";
import { Panel, StackedList, StackedListItem } from "../components/Primitives";
import { withAuth } from "../components/utils/withAuth";

export const getServerSideProps = withAuth((context) => {
  return { props: {} };
});

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
              title={el.name}
              subtitle={el.url}
              actions={
                <div className="space-x-2">
                  <Link href={`/websites/${el.seed}/edit`}>
                    <a className="inline-flex items-center shadow-sm px-2.5 py-0.5 border border-gray-300 text-sm leading-5 font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50">
                      Edit
                    </a>
                  </Link>
                  <Link href={`/websites/${el.seed}`}>
                    <a className="inline-flex items-center shadow-sm px-2.5 py-0.5 border border-gray-300 text-sm leading-5 font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50">
                      VIew Dashboard
                    </a>
                  </Link>
                </div>
              }
            />
          ))}
        </StackedList>
      </Panel>
    </div>
  );
};

export default Websites;
