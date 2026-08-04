import { ChartArea } from "lucide-react";
import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { MetricHint } from "~/components/metric-hint";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  formatBucket,
  formatBucketLong,
  formatBucketWithDay,
  formatCompactNumber,
  formatNumber,
} from "~/lib/format";
import type { TimeseriesPoint } from "~/lib/types";
import { cn } from "~/lib/utils";

const chartConfig = {
  count: { label: "Pageviews", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

/** Chart and empty state share this so the card keeps its size either way. */
const BODY_HEIGHT = "h-[240px] md:h-[300px]";

const BUCKET_HINT =
  "The presets are rolling windows that do not begin on the hour or the day they are bucketed by, so the first and last columns cover part of a bucket rather than all of one. A low bar at either end may be the edge of the window rather than a dip in traffic; the same applies to the peak, which is read off these buckets.";

/**
 * The axis labels, with the day attached to any that would otherwise repeat.
 *
 * A 24 hour preset pads to 25 hourly buckets — `date_trunc('hour', now - 24h)`
 * through `date_trunc('hour', now)` — so its first and last are the same hour
 * of the clock and the axis drew "2 PM" at both ends, one hour of real traffic
 * split between them. Only the tooltip carried the date that told them apart.
 * Qualifying just the repeats keeps every unambiguous window as short as it was.
 */
function useBucketLabels(data: TimeseriesPoint[], unit: "hour" | "day") {
  return useMemo(() => {
    const labels = new Map<string, string>();

    if (unit === "day") {
      for (const point of data) {
        labels.set(point.timeseries, formatBucket(point.timeseries, "day"));
      }

      return labels;
    }

    const seen = new Map<string, number>();

    for (const point of data) {
      const hour = formatBucket(point.timeseries, "hour");

      seen.set(hour, (seen.get(hour) ?? 0) + 1);
    }

    for (const point of data) {
      const hour = formatBucket(point.timeseries, "hour");

      labels.set(
        point.timeseries,
        (seen.get(hour) ?? 0) > 1 ? formatBucketWithDay(point.timeseries) : hour
      );
    }

    return labels;
  }, [data, unit]);
}

export function TimeseriesChart({
  data,
  unit,
}: {
  data: TimeseriesPoint[];
  unit: "hour" | "day";
}) {
  // Two charts can share a page, and a shared gradient id would make the second
  // one paint with the first one's fill.
  const gradientId = `aurora-curtain-${useId().replace(/:/g, "")}`;

  const peak = data.reduce((max, point) => Math.max(max, point.count), 0);
  const labels = useBucketLabels(data, unit);

  // `accessibilityLayer` makes Recharts emit `role="application"` with
  // `tabindex="0"`, so the chart is a keyboard stop whose accessible name would
  // otherwise be computed from its own contents — the axis ticks run together
  // as "Jul 5Jul 605101520". The keyboard navigation is worth keeping; the name
  // has to be stated.
  const label =
    data.length === 0
      ? "Pageviews chart, no data in this range"
      : `Pageviews per ${unit}, ${formatBucketLong(
          data[0].timeseries,
          unit
        )} to ${formatBucketLong(
          data[data.length - 1].timeseries,
          unit
        )}, peak ${formatNumber(peak)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1 text-sm font-medium">
          Pageviews
          <MetricHint about="Pageviews over time">{BUCKET_HINT}</MetricHint>
        </CardTitle>
        <CardDescription className="text-xs">
          {unit === "hour" ? "Hourly" : "Daily"}
        </CardDescription>
        <CardAction className="text-right">
          <div className="text-eyebrow text-muted-foreground">Peak</div>
          <div className="num text-sm font-medium">
            {formatCompactNumber(peak)}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {peak === 0 ? (
          <Empty className={BODY_HEIGHT}>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartArea />
              </EmptyMedia>
              <EmptyTitle>No pageviews in this range</EmptyTitle>
              <EmptyDescription>
                If the site is live, the tracking snippet may not be installed
                yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={chartConfig}
            className={cn("aspect-auto w-full", BODY_HEIGHT)}
          >
            <AreaChart
              accessibilityLayer
              aria-label={label}
              data={data}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                {/*
                 * The signature: the aurora spectrum fading into the surface,
                 * the way the band sits over the horizon in the logo. The stop
                 * opacities are the fade, so the area is drawn at full opacity
                 * rather than Recharts' 0.6 default.
                 */}
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-chart-2)"
                    stopOpacity={0.38}
                  />
                  <stop
                    offset="45%"
                    stopColor="var(--color-chart-1)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-chart-1)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="timeseries"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                fontSize={11}
                tickFormatter={(value) =>
                  labels.get(String(value)) ?? formatBucket(String(value), unit)
                }
              />
              <YAxis
                width={40}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                allowDecimals={false}
                domain={[0, "auto"]}
                tickFormatter={formatCompactNumber}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value) =>
                      formatBucketLong(String(value), unit)
                    }
                  />
                }
              />
              <Area
                dataKey="count"
                type="monotone"
                stroke="var(--color-chart-1)"
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
