import {
  ArrowUpRight,
  CornerDownRight,
  FileText,
  Globe,
  Languages,
  Laptop,
  type LucideIcon,
  MapPin,
  Megaphone,
  Monitor,
  Route,
  Search,
  Share2,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useMemo, useState } from "react";
// Type-only: nothing in db/schema.ts reaches the client bundle, and the point is
// that a channel added there breaks the icon map below.
import type { ChannelType } from "~/db/schema";
import {
  DAILY_VISITORS_HINT,
  MetricHint,
} from "~/shared/components/metric-hint";
import { Button } from "~/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/shared/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/shared/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/shared/ui/tabs";
import {
  countryFlag,
  formatChannel,
  formatCompactNumber,
  formatCountry,
  formatNumber,
  formatReferrer,
} from "~/shared/lib/format";
import type { Breakdown, BreakdownRow, BreakdownUnit } from "../types";

/**
 * Closed on purpose, and `KIND_ICON` below is keyed by it: a dimension wired
 * into a panel without deciding how it is labelled and what it is drawn with
 * fails to compile. It is the only compile-time guard the dashboard has, since
 * the loader payload reaches it as an identifier and never gets an
 * excess-property check.
 *
 * The five utm dimensions share one kind. They are the same kind of thing —
 * campaign parameters, raw strings, no per-value meaning to decode — and five
 * near-identical entries would only be five chances for them to drift.
 */
export type BreakdownKind =
  | "page"
  | "referrer"
  | "channel"
  | "device"
  | "os"
  | "browser"
  | "country"
  | "locale"
  | "campaign";

/**
 * A tab is the panel plus the two labels that name it, and it carries the panel
 * whole — `{ value, label, kind, ...breakdowns.referrers }` at the call site —
 * rather than lifting `rows` out of it. The unit is what the count column is
 * headed with, and separating the two is how a panel counting sessions ends up
 * headed "Views".
 */
export type BreakdownTab = {
  value: string;
  label: string;
  kind: BreakdownKind;
} & Breakdown;

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

const EMPTY_HINT =
  "Try a wider range, or check that the tracking snippet is installed.";

const MOBILE_OS = new Set([
  "android",
  "ios",
  "ipados",
  "harmonyos",
  "windows phone",
]);

const KIND_ICON: Record<BreakdownKind, LucideIcon> = {
  page: FileText,
  referrer: ArrowUpRight,
  channel: Route,
  device: Monitor,
  os: Laptop,
  // Per-vendor browser marks would mean shipping their logos; a globe says
  // "browser" without borrowing anyone's trademark.
  browser: Globe,
  country: MapPin,
  locale: Languages,
  campaign: Megaphone,
};

/**
 * The five channels are a closed set with five distinct meanings, and the whole
 * list fits on screen at once — one mark repeated five times would be
 * decoration. `direct` shares the referrer tab's mark because the two buckets
 * largely hold the same visits and the tabs are read against each other.
 *
 * Keyed by `ChannelType` for the same reason as CHANNEL_LABELS in format.ts: a
 * channel added to the schema has to be given a mark here rather than quietly
 * falling back to the generic one.
 */
const CHANNEL_ICON: Record<ChannelType, LucideIcon> = {
  direct: CornerDownRight,
  search: Search,
  social: Share2,
  referral: ArrowUpRight,
  campaign: Megaphone,
};

function iconFor(kind: BreakdownKind, value: string): LucideIcon {
  const normalized = value.toLowerCase();

  // The bucket with no external origin to point at gets its own mark.
  if (kind === "referrer" && !value) {
    return CornerDownRight;
  }

  // Cast because the value arrives from the database as a plain string; the
  // CHECK constraint is what makes the fallback unreachable, not the type.
  if (kind === "channel") {
    return CHANNEL_ICON[normalized as ChannelType] ?? KIND_ICON.channel;
  }

  if (kind === "device" && normalized === "mobile") {
    return Smartphone;
  }

  if (kind === "device" && normalized === "tablet") {
    return Tablet;
  }

  if (kind === "os" && MOBILE_OS.has(normalized)) {
    return Smartphone;
  }

  return KIND_ICON[kind];
}

function labelFor(kind: BreakdownKind, value: string) {
  if (kind === "referrer") {
    return formatReferrer(value);
  }

  // The column is stored lowercase and CHECK-constrained to five values, so it
  // reaches the panel as `direct` rather than `Direct`.
  if (kind === "channel") {
    return formatChannel(value);
  }

  // Alpha-2 codes are what the edge headers speak and what the query layer
  // deliberately keeps; naming them is the dashboard's half of that bargain.
  if (kind === "country") {
    return formatCountry(value);
  }

  return value || "Unknown";
}

/**
 * The count column's header, and the noun the truncation note uses.
 *
 * Read off the panel's own `unit` and never passed in beside it. A panel scoped
 * to arrivals reports sessions, and one still headed "Views" while doing so is
 * the defect this dashboard exists to remove, stated in a word instead of a
 * number.
 */
const UNIT_LABEL: Record<BreakdownUnit, { column: string; noun: string }> = {
  views: { column: "Views", noun: "views" },
  sessions: { column: "Sessions", noun: "sessions" },
};

/**
 * Rows that arrive under the same element are one row.
 *
 * The rows are grouped in SQL, so within a single dimension the database cannot
 * hand back a duplicate — but the payload is rewritten on the way here. The
 * locales panel is the live case: `toLocaleName` in metrics.server.ts replaces
 * the stored BCP-47 tag with a display name, and several distinct tags share
 * one name — `zh` and `zh-Hans` are both "Chinese (Simplified)", as are
 * nb/no, sr/sr-Latn, uz/uz-Latn and az/az-Latn. Keyed by the post-transform
 * value, React logged "two children with the same key" and drew the language
 * twice with its counts split, so 10 views and 3 views read as two languages
 * rather than one with 13.
 *
 * `unique` is summed, which is an upper bound rather than a distinct count:
 * one visitor who reported two tags of the same language in one window would be
 * counted twice. A browser sends one Accept-Language per request, so that costs
 * nothing in practice, and the alternative — taking the larger of the two —
 * understates by however many visitors the other tag had to itself.
 */
function mergeRows(rows: BreakdownRow[]) {
  const merged = new Map<string, BreakdownRow>();

  for (const row of rows) {
    const found = merged.get(row.element);

    if (found) {
      found.count += row.count;
      found.unique += row.unique;
    } else {
      merged.set(row.element, { ...row });
    }
  }

  // The count first, then the element, matching the SQL the rows arrived
  // ordered by: the tie-break is what stops the folded list reshuffling between
  // renders.
  //
  // The rule guards against mutating a caller's array; this one was built on
  // the line above and nothing else can see it. toSorted would need lib: es2023.
  // oxlint-disable-next-line unicorn/no-array-sort
  return [...merged.values()].sort(
    (a, b) => b.count - a.count || a.element.localeCompare(b.element)
  );
}

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

function BreakdownRowItem({
  row,
  kind,
  maxCount,
}: {
  row: BreakdownRow;
  kind: BreakdownKind;
  maxCount: number;
}) {
  const Icon = iconFor(kind, row.element);
  const label = labelFor(kind, row.element);
  // A flag identifies a country faster than its name reads, and costs an emoji.
  // Empty for the unknown bucket and on platforms without flag glyphs, which is
  // why the name is never carried by it alone.
  const flag = kind === "country" ? countryFlag(row.element) : "";
  // Relative to the leader, not to the total: it keeps the shape readable when
  // a long tail would otherwise flatten every bar to nothing.
  const share = maxCount > 0 ? (row.count / maxCount) * 100 : 0;

  return (
    // The bar is an absolutely positioned element rather than a hard stop in a
    // background gradient. A gradient cannot have a rounded end — there is no
    // border-radius on a colour stop — and the square edge was the one thing
    // that read as unfinished next to everything else on the card.
    //
    // That makes the row the containing block, which is what the gradient was
    // avoiding. It is safe here and was not always: `position: relative` on a
    // `<tr>` is undefined in the table spec but implemented by every engine in
    // use. The cost is that the bar, being positioned, paints over the
    // *content* of the unpositioned cells beside it rather than under it — so
    // the two numeric cells are marked `relative` to put them back on top.
    //
    // The dark tint is 18% rather than the 22% it was. The bar composites under
    // the row's hover colour as well as over the card, and the Daily visitors
    // cell is `text-muted-foreground`: at 22% that cell measured 4.59:1 resting
    // and 4.38:1 hovered, so hover was what pushed it under 4.5:1, across the
    // leftmost fifth of every row in all seven panels. At 18% it is 4.90:1 and
    // 4.68:1. The light tint is 12% and was never close to the line.
    <tr className="relative [--bar-tint:12%] hover:bg-muted/40 dark:[--bar-tint:18%]">
      <th scope="row" className="h-8 px-2 text-left font-normal">
        <span
          aria-hidden
          className="absolute inset-y-0.5 left-0 rounded-sm bg-[color-mix(in_oklch,var(--primary)_var(--bar-tint),transparent)]"
          style={{ width: `${share.toFixed(1)}%` }}
        />
        <span className="relative flex items-center gap-2">
          {flag ? (
            <span
              aria-hidden
              className="w-3.5 shrink-0 text-center text-xs leading-none"
            >
              {flag}
            </span>
          ) : (
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 truncate" title={row.element || label}>
            {label}
          </span>
        </span>
      </th>
      <td
        className="num relative h-8 px-2 text-right"
        title={formatNumber(row.count)}
      >
        {formatCompactNumber(row.count)}
      </td>
      <td
        className="num relative h-8 px-2 text-right text-muted-foreground"
        title={formatNumber(row.unique)}
      >
        {formatCompactNumber(row.unique)}
      </td>
    </tr>
  );
}

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

function BreakdownList({ tab, title }: { tab: BreakdownTab; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(() => mergeRows(tab.rows), [tab.rows]);
  const unit = UNIT_LABEL[tab.unit];
  // The card's title plus the tab's, except where a single-dimension panel
  // would otherwise say the same word twice ("Pages: Pages").
  const name = title === tab.label ? title : `${title}: ${tab.label}`;

  if (sorted.length === 0) {
    const Icon = KIND_ICON[tab.kind];

    return (
      // `h-full` so the dashed frame fills the card. Panels sit in a grid row
      // whose height is set by the tallest sibling, and an empty one that only
      // claimed its min-height left a band of blank card under it.
      <Empty className="h-full min-h-56">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>No data in this range</EmptyTitle>
          <EmptyDescription>{EMPTY_HINT}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const maxCount = sorted[0].count;
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_ROWS);
  // Measured before the merge: merging can pull the length under the limit
  // while the list is still the top of a longer one.
  const capped = tab.rows.length >= ROW_CAP;

  return (
    <div className="flex flex-col">
      {/* The height lives on the wrapper, not the table: a folded list, a full
          one and the empty state all have to leave the card the same size, and
          a table-row-group does not take a min-height. */}
      <div className="min-h-56">
        <table className="w-full table-fixed text-sm">
          <PanelCaption>{name}</PanelCaption>
          <PanelColumns label={tab.label} count={unit.column} />
          <tbody>
            {visible.map((row) => (
              <BreakdownRowItem
                key={row.element}
                row={row}
                kind={tab.kind}
                maxCount={maxCount}
              />
            ))}
          </tbody>
        </table>
      </div>

      {expanded && capped && (
        <TruncationNote count={sorted.length} by={unit.noun} />
      )}

      {sorted.length > COLLAPSED_ROWS && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full"
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? "Show less" : expandLabel(sorted.length, capped)}
        </Button>
      )}
    </div>
  );
}

export function BreakdownPanel({
  title,
  tabs,
  hint,
}: {
  title: string;
  tabs: BreakdownTab[];
  hint?: string;
}) {
  const header = (
    <CardTitle className="flex h-7 items-center gap-1 text-sm font-medium">
      {title}
      {hint ? <MetricHint about={title}>{hint}</MetricHint> : null}
    </CardTitle>
  );

  // One dimension is not a tab set. Base UI's TabsPanel emits role="tabpanel"
  // with tabIndex={0} whether or not a Tab was registered for it, and hiding
  // the TabsList left four panels on the dashboard as extra keyboard stops
  // owning no tab, with no aria-labelledby and an accessible name flattened out
  // of their own contents.
  if (tabs.length === 1) {
    return (
      <Card className="h-full gap-2 pb-2">
        <CardHeader className="items-center pb-2 [border-bottom:1px_solid_var(--border)] max-sm:grid-cols-1">
          {header}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-2">
          <BreakdownList tab={tabs[0]} title={title} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full gap-2 pb-2">
      <Tabs defaultValue={tabs[0].value} className="h-full">
        {/* The rule under the header is what the active tab's marker sits on,
            so the tab reads as selecting a section of the card rather than
            floating above it. -20px is the distance from a trigger's bottom
            edge to that border: 3px of list padding, the header's 16px
            padding-bottom, and 1px of border to cover. */}
        <CardHeader className="items-center pb-2 [border-bottom:1px_solid_var(--border)] max-sm:grid-cols-1">
          {header}
          <CardAction className="row-span-1 self-center max-sm:col-start-1 max-sm:row-start-2 max-sm:justify-self-start">
            <TabsList variant="line" className="[--tab-underline-offset:-12px]">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardAction>
        </CardHeader>

        {tabs.map((tab) => (
          // Kept mounted so each list holds its own expanded state across switches.
          <TabsContent key={tab.value} value={tab.value} keepMounted>
            <CardContent className="flex h-full flex-col px-2">
              <BreakdownList tab={tab} title={title} />
            </CardContent>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
