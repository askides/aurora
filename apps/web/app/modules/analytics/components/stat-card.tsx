import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { MetricHint } from "~/shared/components/metric-hint";
import { Card, CardContent } from "~/shared/ui/card";
import type { Trend } from "~/shared/lib/format";
import { cn } from "~/shared/lib/utils";

const TREND_ICONS = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  flat: MinusIcon,
};

/**
 * Direction alone doesn't say whether a metric moved the right way: more
 * pageviews is good, more bounces is not.
 */
function trendTone(direction: Trend["direction"], invert: boolean) {
  if (direction === "flat") {
    return "text-muted-foreground";
  }

  const good = invert ? direction === "down" : direction === "up";

  return good ? "text-success" : "text-destructive";
}

export function StatCard({
  label,
  value,
  trend,
  invertTrend = false,
  hint,
}: {
  label: string;
  value: string;
  trend?: Trend;
  invertTrend?: boolean;
  hint?: string;
}) {
  const TrendIcon = trend ? TREND_ICONS[trend.direction] : null;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <span className="text-eyebrow text-muted-foreground">{label}</span>

          {hint ? <MetricHint about={label}>{hint}</MetricHint> : null}
        </div>

        <p className="num-display text-2xl font-semibold">{value}</p>

        {trend && TrendIcon ? (
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono",
                trendTone(trend.direction, invertTrend)
              )}
            >
              <TrendIcon className="size-3" />
              {trend.label}
            </span>
            <span className="text-muted-foreground">vs. previous period</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
