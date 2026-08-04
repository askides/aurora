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
import { MetricHint } from "~/shared/components/metric-hint";
import {
  COLLAPSED_ROWS,
  expandLabel,
  PanelCaption,
  PanelColumns,
  ROW_CAP,
  TruncationNote,
} from "./panel";
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
