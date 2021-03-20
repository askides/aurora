import Head from "next/head";
import SideMenu from "../components/layout/SideMenu";
import SideNarrow from "../components/layout/SideNarrow";
import Header from "../components/layout/Header";
import PageHeader from "../components/PageHeader";
import SimpleChart from "../components/SimpleChart";
import ListView from "../components/ListView";

export default function Home() {
  return (
    <div class="h-screen flex overflow-hidden bg-gray-50">
      <SideNarrow />
      <div class="flex flex-col min-w-0 flex-1 overflow-hidden">
        {/*  Main area  */}
        <PageHeader />
        <div class="flex-1 relative z-0 flex overflow-hidden">
          <main
            class="flex-1 relative z-0 overflow-y-auto focus:outline-none xl:order-last"
            tabindex="0">
            <div class="absolute inset-0 py-6 px-4 sm:px-6 lg:px-8">
              <div class="h-full border-2 border-gray-200 border-dashed rounded-lg">
                <SimpleChart />
              </div>
            </div>
          </main>

          <aside class="hidden relative xl:order-first xl:flex xl:flex-col flex-shrink-0 w-96 border-r border-gray-200">
            <div class="absolute inset-0 py-6 px-4 sm:px-6 lg:px-8">
              <div class="h-full border-2 border-gray-200 border-dashed rounded-lg space-y-4">
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
