import {
  DAILY_VISITORS_HINT,
  MetricHint,
} from "~/shared/components/metric-hint";

/**
 * The parts every panel on the dashboard is built out of.
 *
 * Their own module because the goals panel needs all of them and is not a
 * breakdown: it was importing seven symbols out of breakdown-panel.tsx, which
 * made one sibling component the other's library and put a 587-line file in the
 * graph between the goals list and two constants. The rule these encode is that
 * the two lists have to make the identical claim — same row cap, same expander
 * wording, same note when the query truncated, same explanation of the bar —
 * and that is easier to hold in one small file than across two large ones.
 */

/** Rows past this are folded away until the reader asks for them. */
export const COLLAPSED_ROWS = 8;

/**
 * The most rows a dimension can arrive with — BREAKDOWN_LIMIT in
 * queries.server.ts, which every breakdown and the goals list are cut to after
 * `ORDER BY sum(views) DESC`.
 *
 * Mirrored here because the expander used to read "Show all (100)" on any site
 * with more than a hundred distinct paths — routine — and expand to exactly a
 * hundred rows while asserting that was the whole list. Nothing else in the
 * panel said the list was cut, so the count column could not be reconciled
 * against the tile above it and there was no way to find out why. A list that
 * arrives at exactly this length is the top of a longer one and says so.
 */
export const ROW_CAP = 100;

/**
 * What the bar behind each row is a share *of*, said on the panel.
 *
 * The length is `row.count / maxCount` — relative to the leading row, not to
 * the column total — which keeps a long tail readable where normalising against
 * the total would flatten every row after the first few to nothing. That is the
 * right drawing and the wrong thing to leave unlabelled: the top row is always
 * a full-width bar, so a leading page holding 12% of a site's traffic is painted
 * exactly like one holding 98%, and no percentage appears anywhere in the panel
 * to contradict the reading. Stated once here and appended to every panel's
 * hint, including the goals list, which draws the identical bar.
 */
export const BAR_BASIS_HINT =
  "The shading behind each row is drawn relative to the longest row, not to the total — the top row is always full width whatever share of the site it holds, so it shows the shape of the list rather than a percentage of anything. The figures are the counts.";

/**
 * The column labels, shared with the goals list so the two read as one table.
 *
 * A real `<thead>` of `<th scope="col">`. These were a `<div>` of `<span>`s
 * sitting *beside* the list, so nothing associated "Views" with the number
 * under it: seven three-column grids on the dashboard and not one `<table>` or
 * `<th>` between them, which left a screen reader announcing "/pricing 500 300"
 * with no way to tell which figure was which.
 *
 * `count` is the caller's word for what the middle column holds, because the
 * panels no longer all hold the same thing: the acquisition dimensions count
 * sessions, the rest count views, and the goals list counts events.
 *
 * The visitor column is named for what it counts. `unique` in the wire shape is
 * a distinct count of an identifier that rotates at midnight, so over a week it
 * is seven days of visitors added together — "Visitors" alone invited every
 * reader to take it for an audience.
 *
 * The hint's accessible name is built from `label` rather than being the bare
 * metric. This component is rendered once per table and there are fourteen of
 * them on a populated dashboard, so a fixed `about="Daily visitors"` put
 * fourteen identically-named buttons in a screen reader's rotor — the exact
 * defect MetricHint's `about` exists to remove, reintroduced by the one hint
 * that is drawn in a loop. `label` is the tab's own noun (Channel, Referrer,
 * Source, Medium, Term, Goal…) and no two tables on the dashboard share one, so
 * naming the trigger after it is enough to tell all fourteen apart.
 */
export function PanelColumns({
  label,
  count,
}: {
  label: string;
  count: string;
}) {
  return (
    <thead className="text-eyebrow text-muted-foreground">
      <tr>
        <th scope="col" className="px-2 pb-1 text-left font-medium">
          {label}
        </th>
        <th scope="col" className="w-16 px-2 pb-1 text-right font-medium">
          {count}
        </th>
        <th scope="col" className="w-32 px-2 pb-1 text-right font-medium">
          {/* Nowrap and a column wide enough to hold it: "Daily visitors" is
              two words and was breaking across two lines against the one-word
              header beside it, which read as a layout fault rather than a
              label. */}
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            Daily visitors
            <MetricHint about={`${label} daily visitors`}>
              {DAILY_VISITORS_HINT}
            </MetricHint>
          </span>
        </th>
      </tr>
    </thead>
  );
}

/**
 * A table's accessible name, as a `<caption>`.
 *
 * Every panel on the dashboard is a `<div data-slot=card>` with a
 * `<div data-slot=card-title>` inside it, so the title is not programmatically
 * attached to anything: a screen reader's table list showed seven unnamed
 * tables in reading order, and the multi-tab panels were only distinguishable
 * because Base UI's tabpanel is `aria-labelledby` its trigger. A caption is the
 * element that names a table, and it is visually hidden here because the title
 * is already on screen — this adds a name for the tables, not a second heading
 * for the sighted reader.
 */
export function PanelCaption({ children }: { children: React.ReactNode }) {
  return <caption className="sr-only">{children}</caption>;
}

/**
 * What the expander says, given how many rows there are and whether the query
 * cut them.
 *
 * Shared with the goals panel because both lists are cut by the same limit and
 * the two claims have to stay identical.
 */
export function expandLabel(count: number, capped: boolean) {
  return capped ? `Show top ${count}` : `Show all (${count})`;
}

/**
 * Stated under an expanded list that the query truncated, and only then.
 *
 * `by` is the unit the cut was made in — the panels order by views or by
 * sessions and the goals list by events — so the note names the same quantity
 * the column beside it is headed with.
 */
export function TruncationNote({ count, by }: { count: number; by: string }) {
  return (
    <p className="px-2 pt-1 text-xs text-muted-foreground">
      Top {count} by {by}. A longer tail exists and is not counted in this list.
    </p>
  );
}
