import Head from "next/head";
import SideMenu from "../components/layout/SideMenu";
import SideNarrow from "../components/layout/SideNarrow";
import Header from "../components/layout/Header";
import PageHeader from "../components/PageHeader";

export default function Home() {
  return (
    <div className="h-screen overflow-hidden bg-gray-100 flex flex-col">
      {/*  Bottom section  */}
      <div className="min-h-0 flex-1 flex overflow-hidden">
        {/*  Narrow sidebar */}
        <SideNarrow />

        {/* Menu sidebar */}
        <SideMenu />

        {/*  Main area  */}
        <main className="lg:flex flex-1 flex-col">
          {/*  Top nav */}
          <PageHeader />

          <div className="min-w-0 flex-1 border-t border-gray-200 lg:flex">
            {/*  Primary column  */}
            <section
              aria-labelledby="primary-heading"
              className="min-w-0 flex-1 h-full flex flex-col overflow-hidden lg:order-last">
              <h1 id="primary-heading" className="sr-only">
                Home
              </h1>
              {/*  Your content  */}
            </section>

            {/*  Secondary column (hidden on smaller screens)  */}
            <aside className="hidden lg:block lg:flex-shrink-0 lg:order-first">
              <div className="h-full relative flex flex-col w-96 border-r border-gray-200 bg-gray-100">
                {/*  Your content  */}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
