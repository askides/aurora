import SideNarrow from "../components/layout/SideNarrow";
import PageHeader from "../components/PageHeader";
import Chart from "../components/Chart";
import ListView from "../components/ListView";
import Stats from "../components/Stats";

export default function Home() {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <SideNarrow />
      <div className="flex min-w-0 flex-1 overflow-y-auto justify-center">
        {/*  Main area  */}
        <div className="flex-1 relative z-0 flex max-w-5xl">
          <main className="flex-1 relative z-0 focus:outline-none xl:order-last" tabIndex="0">
            <div className="absolute inset-0 py-6 px-4 sm:px-6 lg:px-8">
              <div className="h-full rounded-lg space-y-4">
                <PageHeader />
                <Stats />
                <Chart url="/api/metrics/views/series" timeRange="this_day" title="Page Views" />
                <ListView />
                <Chart url="/api/metrics/views/browsers" timeRange="this_day" />
                <Chart url="/api/metrics/views/oses" timeRange="this_day" />

                <div className="grid grid-cols-3 grid-rows-3 gap-4">
                  {/*
                  <Tile>
                    <div className="flex flex-col text-center">
                      <div>5890</div>
                      <div>iPhone</div>
                    </div>
                  </Tile>
                  <Tile>
                    <div className="flex flex-col text-center">
                      <div>1456</div>
                      <div>Chrome</div>
                    </div>
                  </Tile>
                  */}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
