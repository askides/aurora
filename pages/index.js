import Head from "next/head";
import { default as NextLink } from "next/link";
import { PageHeading } from "../components/PageHeading";
import { Link } from "../components/Link";
import { useMeWebsites } from "../hooks/useMeWebsites";
import { withAuth } from "../hoc/withAuth";

const Websites = () => {
  const { websites, isLoading, isError } = useMeWebsites();

  if (isLoading) return <div>Loading..</div>;
  if (isError) return <div>failed to load</div>;

  return (
    <div className="p-6 h-full">
      <Head>
        <title>Websites</title>
      </Head>

      <PageHeading
        title={"Websites"}
        breadcumbs={["Websites", "List"]}
        actions={<Link value="Create New" href="/websites/create" />}
      />

      <div className="mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {websites.map((website) => (
            <div className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
              <div className="w-full flex items-center justify-between p-6 space-x-6">
                <div className="flex-1 truncate">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-gray-900 text-sm font-medium truncate">{website.name}</h3>
                  </div>
                  <p className="mt-1 text-gray-500 text-sm truncate">{website.url}</p>
                </div>
                <span className="flex-shrink-0 inline-block px-2 py-0.5 text-green-800 text-sm font-medium bg-green-100 rounded-full">
                  {website.shared ? "Public" : "Private"}
                </span>
              </div>
              <div>
                <div className="-mt-px flex divide-x divide-gray-200">
                  <div className="w-0 flex-1 flex">
                    <NextLink href={`/websites/${website.seed}/edit`}>
                      <a className="relative -mr-px w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-gray-700 font-medium border border-transparent rounded-bl-lg hover:text-gray-500">
                        <span className="ml-3">Edit</span>
                      </a>
                    </NextLink>
                  </div>
                  <div className="-ml-px w-0 flex-1 flex">
                    <NextLink href={`/websites/${website.seed}`}>
                      <a className="relative w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-gray-700 font-medium border border-transparent rounded-br-lg hover:text-gray-500">
                        <span className="ml-3">Dashboard</span>
                      </a>
                    </NextLink>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default withAuth(Websites);
