import Link from "next/link";
import PageTitle from "../components/layout/PageTitle";
import { Button } from "../components/AuroraForm";
import { LoadingPanel, Panel, StackedList, StackedListItem } from "../components/Primitives";
import { withAuth } from "../components/utils/withAuth";
import { useWebsites } from "../components/utils/useWebsites";

const Websites = () => {
  const { websites, isLoading, isError } = useWebsites();

  if (isLoading) return <LoadingPanel />;
  if (isError) return <div>failed to load</div>;

  return (
    <div className="h-full rounded-lg space-y-4 bg-gray-900">
      <PageTitle text="Websites" actions={<Button href="/websites/create" label="Create New" />} />

      <Panel>
        <StackedList>
          {websites.map((el, key) => (
            <StackedListItem
              key={key}
              avatar={`https://avatars.dicebear.com/api/jdenticon/${el.url}.svg`}
              title={el.name}
              subtitle={el.url}
              actions={
                <div className="space-x-2 divide-y-1 divide-gray-700">
                  <Link href={`/websites/${el.seed}/edit`}>
                    <a className="inline-flex items-center shadow-sm px-2.5 py-0.5 text-sm leading-5 font-medium rounded-full text-gray-700 dark:text-blue-500">
                      Edit
                    </a>
                  </Link>
                  <Link href={`/websites/${el.seed}`}>
                    <a className="inline-flex items-center shadow-sm px-2.5 py-0.5 text-sm leading-5 font-medium rounded-full text-gray-700 dark:text-blue-500">
                      View Dashboard
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

export default withAuth(Websites);
