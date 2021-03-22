import { useState } from "react";
import PageHeader from "../components/PageHeader";
import Chart from "../components/Chart";
import ListView from "../components/ListView";
import Stats from "../components/Stats";
import Header from "../components/layout/Header";

const Home = () => {
  const [timeRange, setTimeRange] = useState("this_day");

  return (
    <div className="h-full rounded-lg space-y-4 bg-gray-900">
      <Header />
      <PageHeader onTimeRangeChange={(value) => setTimeRange(value)} />
      <Stats timeRange={timeRange} />
      <Chart url="/api/metrics/views/series" timeRange={timeRange} title="Page Views" />
      <ListView />
      <Chart url="/api/metrics/views/browsers" timeRange={timeRange} />
      <Chart url="/api/metrics/views/oses" timeRange={timeRange} />

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
  );
};

export default Home;
