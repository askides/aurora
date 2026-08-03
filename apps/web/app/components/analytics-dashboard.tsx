import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { BreakdownTable } from "~/components/breakdown-table";
import { TimeseriesChart } from "~/components/timeseries-chart";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { BreakdownRow, Statistics, TimeseriesPoint } from "~/lib/types";

const RANGE_OPTIONS = [
  { value: "LAST_24_HOURS", label: "Last 24 Hours" },
  { value: "LAST_7_DAYS", label: "Last 7 Days" },
  { value: "LAST_30_DAYS", label: "Last 30 Days" },
];

export type DashboardData = {
  range: string;
  stats: Statistics;
  series: TimeseriesPoint[];
  breakdowns: {
    pages: BreakdownRow[];
    referrers: BreakdownRow[];
    devices: BreakdownRow[];
    os: BreakdownRow[];
    browsers: BreakdownRow[];
    countries: BreakdownRow[];
  };
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl leading-none tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard({ data }: { data: DashboardData }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Bucketing is timezone-sensitive and the server can't know the visitor's
  // zone, so the first client render pins it into the URL.
  useEffect(() => {
    if (searchParams.has("tz")) {
      return;
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!tz) {
      return;
    }

    setSearchParams(
      (prev) => {
        prev.set("tz", tz);
        return prev;
      },
      { replace: true, preventScrollReset: true }
    );
  }, [searchParams, setSearchParams]);

  const onRangeChange = (range: unknown) => {
    setSearchParams(
      (prev) => {
        prev.set("range", String(range));
        return prev;
      },
      { preventScrollReset: true }
    );
  };

  const { stats, breakdowns } = data;

  return (
    <div className="flex flex-col gap-5">
      <Select value={data.range} onValueChange={onRangeChange}>
        <SelectTrigger className="w-full md:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Page Views" value={stats.visits} />
        <Stat label="Unique Visitors" value={stats.uniqueVisits} />
        <Stat label="Bounces" value={stats.bounces} />
        <Stat
          label="Average Visit Time"
          value={`${Math.ceil(stats.avgDuration / 1000)}s`}
        />
      </div>

      <TimeseriesChart data={data.series} />

      <div className="grid gap-5 md:grid-cols-2">
        <BreakdownTable title="Page" rows={breakdowns.pages} />
        <BreakdownTable title="Referrer" rows={breakdowns.referrers} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <BreakdownTable title="Device" rows={breakdowns.devices} />
        <BreakdownTable title="OS" rows={breakdowns.os} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <BreakdownTable title="Browser" rows={breakdowns.browsers} />
        <BreakdownTable title="Country" rows={breakdowns.countries} />
      </div>
    </div>
  );
}
