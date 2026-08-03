import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import type { TimeseriesPoint } from "~/lib/types";

/**
 * ApexCharts touches `window` at module scope, so the chart only mounts after
 * hydration. The card renders a skeleton of the same height server-side to keep
 * the layout from jumping.
 */
export function TimeseriesChart({ data }: { data: TimeseriesPoint[] }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);

    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Number of Page Visits</CardTitle>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-[500px] w-full" />
        ) : (
          <Chart
            type="bar"
            height={500}
            series={[{ name: "Page Views", data: data.map((d) => d.count) }]}
            options={{
              chart: {
                fontFamily: "inherit",
                parentHeightOffset: 0,
                toolbar: { show: false },
                animations: { enabled: true },
                stacked: true,
                foreColor: isDark ? "#fff" : "#000",
                zoom: { enabled: false },
                background: "transparent",
              },
              plotOptions: { bar: { columnWidth: "80%" } },
              dataLabels: { enabled: false },
              fill: { opacity: 1 },
              grid: {
                padding: { top: -20, right: 0, left: -4, bottom: 20 },
                strokeDashArray: 4,
                xaxis: { lines: { show: true } },
              },
              xaxis: {
                type: "datetime",
                labels: { datetimeUTC: false },
                tooltip: { enabled: false },
                axisBorder: { show: false },
              },
              tooltip: { enabled: true, followCursor: false },
              labels: data.map((d) => d.timeseries),
              colors: [isDark ? "#bfe399" : "#555de3"],
              legend: {
                show: true,
                fontSize: "16px",
                itemMargin: { horizontal: 10, vertical: 0 },
              },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
