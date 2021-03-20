import Head from "next/head";
import SideMenu from "../components/layout/SideMenu";
import SideNarrow from "../components/layout/SideNarrow";
import Header from "../components/layout/Header";
import PageHeader from "../components/PageHeader";
import SimpleChart from "../components/SimpleChart";
import ListView from "../components/ListView";
import Stats from "../components/Stats";
import Tile from "../components/Tile";

export default function Home() {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <SideNarrow />
      <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
        {/*  Main area  */}
        <PageHeader />
        <div className="flex-1 relative z-0 flex">
          <main
            className="flex-1 relative z-0 overflow-y-auto focus:outline-none xl:order-last"
            tabIndex="0">
            <div className="absolute inset-0 py-6 px-4 sm:px-6 lg:px-8">
              <div className="h-full  rounded-lg">
                <SimpleChart />

                <div className="grid grid-cols-3 grid-rows-3 gap-4">
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
                </div>
              </div>
            </div>
          </main>

          <aside className="overflow-y-auto hidden relative xl:order-first xl:flex xl:flex-col flex-shrink-0 w-96 border-r border-gray-200">
            <div className="absolute inset-0 py-6 px-4 sm:px-6 lg:px-8">
              <div className="h-full border-2 border-gray-200 border-dashed rounded-lg space-y-4">
                <Stats />
                <ListView />
                <ListView />
                <ListView />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
