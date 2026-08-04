import { Target } from "lucide-react";
import { useState } from "react";
import {
  BAR_BASIS_HINT,
  COLLAPSED_ROWS,
  expandLabel,
  PanelCaption,
  PanelColumns,
  ROW_CAP,
  TruncationNote,
} from "./breakdown-panel";
import { MetricHint } from "~/shared/components/metric-hint";
import { Button } from "~/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/shared/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/shared/ui/empty";
import {
  formatCompactNumber,
  formatMoney,
  formatNumber,
} from "~/shared/lib/format";
import type { CustomEventRow } from "../types";

/**
 * Goals: the named events a site reports itself through `aurora()`.
 *
 * Not a `BreakdownPanel` tab, and it can't be one. A goal is
 * {name, count, unique, revenue[]} where a breakdown row is
 * {element, views, unique}, and the revenue is a list of per-currency totals
 * that the two fixed numeric columns have nowhere to put. Mapping it into a
 * breakdown row would mean dropping the money, which is the half of the panel
 * that pays for itself.
 */
function GoalRow({ row, maxCount }: { row: CustomEventRow; maxCount: number }) {
  // Relative to the leader, matching the breakdown rows: a site with one goal
  // firing thousands of times and another firing twice still shows both.
  const share = maxCount > 0 ? (row.count / maxCount) * 100 : 0;

  return (
    // A row of a real table, for the reason given on PanelColumns: the column
    // labels have to be programmatically attached to the figures under them.
    // The bar is a positioned child rather than a background gradient, for the
    // reason given on BreakdownRowItem — a gradient stop cannot be rounded —
    // including why the two numeric cells have to be `relative`.
    // Same tints as BreakdownRowItem, and the dark one is 18% for the reason
    // given there: at 22% the muted-foreground cell fell to 4.38:1 on hover.
    <tr className="relative [--bar-tint:12%] hover:bg-muted/40 dark:[--bar-tint:18%]">
      <th scope="row" className="px-2 py-1.5 text-left font-normal">
        <span
          aria-hidden
          className="absolute inset-y-0.5 left-0 rounded-sm bg-[color-mix(in_oklch,var(--primary)_var(--bar-tint),transparent)]"
          style={{ width: `${share.toFixed(1)}%` }}
        />
        <span className="relative flex items-center gap-2">
          <Target className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate" title={row.name || undefined}>
            {row.name || "Unnamed"}
          </span>

          {row.revenue.length > 0 && (
            // One entry per currency, never a total across them: 49 EUR plus
            // 10 USD is not 59 of anything, and reporting it as one number is
            // the bug the query layer was corrected for. Whatever a site sells
            // in, it sees. Inside the goal's own cell, because it is a fact
            // about the goal and not a fourth column.
            //
            // On the goal's own line rather than under it. A second line made
            // the one goal that earns money twice the height of every other
            // row, and the bar behind it — which spans the row — stopped
            // reading as a longer bar and started reading as a block. The name
            // truncates and the money does not: a goal too long to fit is still
            // identifiable from its first characters, whereas a truncated
            // amount is worse than no amount.
            <ul className="flex shrink-0 items-center gap-x-2.5 pl-1 text-xs text-muted-foreground">
              {row.revenue.map((entry) => (
                <li key={entry.currency} className="num">
                  {formatMoney(entry.total, entry.currency)}
                </li>
              ))}
            </ul>
          )}
        </span>
      </th>
      <td
        className="num relative px-2 py-1.5 text-right"
        title={formatNumber(row.count)}
      >
        {formatCompactNumber(row.count)}
      </td>
      <td
        className="num relative px-2 py-1.5 text-right text-muted-foreground"
        title={formatNumber(row.unique)}
      >
        {formatCompactNumber(row.unique)}
      </td>
    </tr>
  );
}

export function GoalsPanel({ rows }: { rows: CustomEventRow[] }) {
  const [expanded, setExpanded] = useState(false);

  const maxCount = rows[0]?.count ?? 0;
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  // The goals CTE is cut by the same BREAKDOWN_LIMIT as every panel, so a list
  // arriving at exactly that length is the top of a longer one.
  const capped = rows.length >= ROW_CAP;

  return (
    <Card className="gap-2 pb-2">
      <CardHeader className="items-center pb-2 [border-bottom:1px_solid_var(--border)]">
        <CardTitle className="flex h-7 items-center gap-1 text-sm font-medium">
          Goals
          {/* Same bar, same basis, so the same sentence: GoalRow's `share` is
              `row.count / rows[0].count` exactly as BreakdownRowItem's is. */}
          <MetricHint about="Goals">{BAR_BASIS_HINT}</MetricHint>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-2">
        {rows.length === 0 ? (
          <Empty className="min-h-56">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Target />
              </EmptyMedia>
              <EmptyTitle>No goals in this range</EmptyTitle>
              <EmptyDescription>
                Goals are the events your own site reports. Call{" "}
                <code>aurora(&quot;signup&quot;)</code> to count one, and pass a
                revenue amount to see what it earned.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col">
            <div className="min-h-56">
              <table className="w-full table-fixed text-sm">
                <PanelCaption>Goals</PanelCaption>
                <PanelColumns label="Goal" count="Events" />
                {/* Already ordered by count then name in SQL, and the tie-break
                    is what keeps the folded list from reshuffling between
                    renders. */}
                <tbody>
                  {visible.map((row) => (
                    <GoalRow key={row.name} row={row} maxCount={maxCount} />
                  ))}
                </tbody>
              </table>
            </div>

            {expanded && capped && (
              <TruncationNote count={rows.length} by="events" />
            )}

            {rows.length > COLLAPSED_ROWS && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 w-full"
                onClick={() => setExpanded((previous) => !previous)}
              >
                {expanded ? "Show less" : expandLabel(rows.length, capped)}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
