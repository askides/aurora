import { useEffect, useMemo } from "react";
import { useNavigation, useSearchParams } from "react-router";
import { BreakdownPanel } from "./breakdown-panel";
import { BAR_BASIS_HINT } from "./panel";
import { GoalsPanel } from "./goals-panel";
import { DAILY_VISITORS_HINT } from "~/shared/components/metric-hint";
import { RangePicker } from "./range-picker";
import { StatCard } from "./stat-card";
import { TimeseriesChart } from "./timeseries-chart";
import { TimezonePicker } from "./timezone-picker";
import {
  durationChange,
  formatCompactNumber,
  formatDuration,
  formatPercent,
  NO_DATA,
  pointChange,
  type Trend,
  trend,
} from "~/shared/lib/format";
import type { RangeSelection } from "../range";
import { bucketsWithin, canonicalTimeZone, isValidTimeZone } from "../timezone";
import type {
  Breakdowns,
  CustomEventRow,
  Statistics,
  TimeseriesPoint,
} from "../types";
import { cn } from "~/shared/lib/utils";

/**
 * Exactly what `loadDashboard` returns.
 *
 * `breakdowns` is the shared `Breakdowns` rather than a local literal of the
 * panels that happen to be drawn. The literal listed six of the twelve
 * dimensions and omitted `events` entirely, and because the payload arrives as
 * an identifier rather than an object literal TypeScript never ran an
 * excess-property check over it: six panels and the whole goals list were
 * queried, paid for and serialised into the document with nothing rendering
 * them and nothing reporting it. Naming the shared type is what makes the next
 * dimension a compile error here instead of a silent drop.
 */
export type DashboardData = {
  range: string;
  /** The resolved window, in epoch milliseconds. */
  from: number;
  to: number;
  unit: "hour" | "day";
  tz: string;
  stats: Statistics;
  previousStats: Statistics;
  series: TimeseriesPoint[];
  breakdowns: Breakdowns;
  events: CustomEventRow[];
};

/** A window with no sessions has no bounce rate, not a rate of zero over zero. */
function bounceRate(stats: Statistics) {
  return stats.sessions > 0 ? stats.bounces / stats.sessions : null;
}

/**
 * The change against the previous window, when there is one to state.
 *
 * A figure that was never measured has no change in either direction: compared
 * against a window that did measure, the difference would read as a fall to
 * zero or a rise from it, and neither of those happened.
 *
 * The comparison itself is passed in, because the three tiles that use this are
 * not the same kind of number. `trend`'s zero-baseline answer is the word
 * "New", which is right about a pageview count that had nothing before it and
 * wrong about a rate: a bounce rate that moved 0% -> 10% was labelled "New" and
 * coloured as a regression, when what happened is that it rose ten points.
 */
function changeOf(
  current: number | null,
  previous: number | null,
  as: (current: number, previous: number) => Trend
) {
  return current === null || previous === null
    ? undefined
    : as(current, previous);
}

const SESSIONS_HINT =
  "A visit: one person's run of pageviews, ended by half an hour without another — or by midnight UTC, which starts a fresh visit because the identifier a visit is tracked by rotates then. A visit that spans midnight UTC therefore counts twice, and each half that stopped at one page counts as a bounce. Bounce rate is measured over exactly these. Average visit is not — its denominator is only the visits that reported a duration, which is a smaller and differently-selected set; the tile beside it says which.";

const BOUNCE_HINT =
  "Share of sessions that left after a single pageview. Stated against the previous window in percentage points, since the change between two rates is not itself a rate.";

const SOURCES_HINT =
  "Where visits came from, counted once each at the pageview that started them — acquisition is a fact about an arrival, not about every page read afterwards. Channel buckets the same arrivals five ways: campaign whenever the link carried utm parameters, then search, social and referral by the referring host, and direct when there was no referrer to read. 'No referrer' on the Referrers tab is that same last group plus any campaign link that arrived without one, which is why the two tabs do not add up the same way. Read Direct as 'no referrer was readable', not as 'typed the address'. A visit also starts fresh after half an hour of inactivity and again at midnight UTC, and someone who then carries on through a link inside the site opens one whose referrer is the site's own previous page — which is discarded as a self-referral. The half-hour restart keeps whatever acquired the visit it continues instead of becoming Direct, so that source is counted twice for the one visit. The midnight restart cannot: the identifier a visit is tracked by rotates then, so there is nothing left to carry it from, and those land in Direct and in 'No referrer' alongside the real arrivals. One consequence to read the Sessions column with: it counts visits that *started* inside this range, while the Sessions tile counts every visit that was active in it — so a visit already running when the range opened is counted by the tile and listed nowhere here, and these rows will always total slightly less than it. " +
  BAR_BASIS_HINT;

const CAMPAIGNS_HINT =
  "The utm parameters on the link a visit arrived through, counted once per visit. Only the pageview that opened the visit is read, so a parameter picked up from a link inside the site is not an acquisition and is not counted here. Visits that carried no utm parameter are not listed at all — the absence of a campaign is not an unidentified one, and on a typical site it would be every row's worth of traffic sitting in a single row above them. What share of visits arrived through a campaign is the Campaign row under Sources, where it has a denominator. Like the Sources card, the Sessions column here counts visits that started inside this range rather than every visit active in it, so it does not reconcile with the Sessions tile. " +
  BAR_BASIS_HINT;

const DURATION_HINT =
  "Time on page summed within a visit, then averaged across the visits that reported one — a five-page visit counts once. Only a page whose unload beacon arrives is timed, and that beacon is refused by many content blockers and never sent for a tab the system closes, so the visits behind this average are a subset of the visits counted beside it — and a subset that under-represents the ones which ended abruptly. Within a visit it is the same gap one step down: a visit that timed two of its five pages contributes two pages of time and still counts once. Stated against the previous window as a difference in time, not a percentage of it.";

const NO_DURATION_HINT =
  "No pageview in this window reported how long it stayed open, so there is no average to show. That is not the same as an average of zero.";

export function AnalyticsDashboard({ data }: { data: DashboardData }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();

  // Bucketing is timezone-sensitive and the server can't know the visitor's
  // zone, so the first client render pins it into the URL.
  useEffect(() => {
    if (searchParams.has("tz")) {
      return;
    }

    // Canonicalised before it goes into the URL: a host whose TZ is a pre-2018
    // name hands one straight back here, and Postgres has no such zone — left
    // as it arrived it would come back to the loader as a 400 on every
    // navigation. Still validated afterwards, so a name neither table knows
    // leaves the dashboard on its UTC default instead of looping through it.
    const tz = canonicalTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    if (!tz || !isValidTimeZone(tz)) {
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

  // The window is a pair of instants either way, so re-grouping it in another
  // zone is only a matter of relabelling the buckets.
  const onTimeZoneChange = (tz: string) => {
    setSearchParams(
      (prev) => {
        prev.set("tz", tz);
        return prev;
      },
      { preventScrollReset: true }
    );
  };

  // A preset and a pinned window are the same filter, so whichever one is
  // chosen clears the other: the URL never carries both.
  const onRangeChange = (selection: RangeSelection) => {
    setSearchParams(
      (prev) => {
        if ("range" in selection) {
          prev.set("range", selection.range);
          prev.delete("from");
          prev.delete("to");
        } else {
          prev.set("from", String(selection.from));
          prev.set("to", String(selection.to));
          prev.delete("range");
        }

        return prev;
      },
      { preventScrollReset: true }
    );
  };

  const { stats, previousStats, breakdowns } = data;
  const rate = bounceRate(stats);

  // `to` is exclusive and the padding the query generates is not, so the last
  // bucket of a whole-day range is one the window stops at rather than one it
  // contains — always empty, and never asked for.
  const series = useMemo(
    () => bucketsWithin(data.series, data.to, data.tz),
    [data.series, data.to, data.tz]
  );

  // Every filter is a navigation, and the panels keep the previous window's
  // figures on screen until the loader answers. Dimming them says the numbers
  // are the old ones rather than letting a changed range look like it did
  // nothing at all.
  const pending = navigation.state === "loading";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <RangePicker
          range={data.range}
          from={data.from}
          to={data.to}
          tz={data.tz}
          onChange={onRangeChange}
        />

        <TimezonePicker value={data.tz} onChange={onTimeZoneChange} />
      </div>

      <div
        aria-busy={pending}
        className={cn(
          "flex flex-col gap-5 transition-opacity",
          pending && "opacity-60"
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Pageviews"
            value={formatCompactNumber(stats.visits)}
            trend={trend(stats.visits, previousStats.visits)}
          />
          {/* Not "Visitors". The identifier behind this count rotates at UTC
              midnight, so the figure is the sum of the window's daily uniques
              and grows with the window rather than with the audience. */}
          <StatCard
            label="Daily Visitors"
            value={formatCompactNumber(stats.uniqueVisits)}
            trend={trend(stats.uniqueVisits, previousStats.uniqueVisits)}
            hint={DAILY_VISITORS_HINT}
          />
          {/* The half-hour rule is not the only one that ends a visit: the
              session lookup is keyed on visitor_id, and that id is an HMAC over
              the UTC date, so at 00:00 UTC ingest finds no prior event and
              opens a new session with is_a_bounce set. The hint has to say so —
              00:00 UTC is 20:00 US Eastern, inside the evening peak. */}
          <StatCard
            label="Sessions"
            value={formatCompactNumber(stats.sessions)}
            trend={trend(stats.sessions, previousStats.sessions)}
            hint={SESSIONS_HINT}
          />
          <StatCard
            label="Bounce rate"
            value={rate === null ? NO_DATA : formatPercent(rate)}
            trend={changeOf(rate, bounceRate(previousStats), pointChange)}
            invertTrend
            hint={BOUNCE_HINT}
          />
          <StatCard
            label="Avg. visit"
            value={formatDuration(stats.avgDuration)}
            trend={changeOf(
              stats.avgDuration,
              previousStats.avgDuration,
              durationChange
            )}
            hint={stats.avgDuration === null ? NO_DURATION_HINT : DURATION_HINT}
          />
        </div>

        <TimeseriesChart data={series} unit={data.unit} />

        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownPanel
            title="Pages"
            hint={BAR_BASIS_HINT}
            tabs={[
              {
                value: "pages",
                label: "Pages",
                kind: "page",
                ...breakdowns.pages,
              },
            ]}
          />
          {/* An acquisition report, which it was not until the two dimensions
              behind it were scoped to `is_new_session`. Grouped over every
              pageview they answered close to the opposite of the truth:
              referrer_host is null on every pageview after the first in a visit
              — the tracker reads document.referrer once per document, ingest
              nulls self-referrals — and channel is resolved per event off that
              same referrer, so pageviews 2..N were classified `direct`. A site
              whose visitors all arrived from one search engine and read five
              pages reported that engine at 100 and Direct at 400.

              Channel leads because it is the answer with no hole in it: every
              arrival lands in exactly one of five buckets, where a third of the
              referrer list is the visits that arrived without one and can never
              be attributed further. Both tabs count sessions, and the column
              header they share says so. */}
          <BreakdownPanel
            title="Sources"
            hint={SOURCES_HINT}
            tabs={[
              {
                value: "channels",
                label: "Channel",
                kind: "channel",
                ...breakdowns.channels,
              },
              {
                value: "referrers",
                label: "Referrer",
                kind: "referrer",
                ...breakdowns.referrers,
              },
            ]}
          />
          <BreakdownPanel
            title="Devices"
            hint={BAR_BASIS_HINT}
            tabs={[
              {
                value: "device",
                label: "Device",
                kind: "device",
                ...breakdowns.devices,
              },
              {
                value: "browser",
                label: "Browser",
                kind: "browser",
                ...breakdowns.browsers,
              },
              { value: "os", label: "OS", kind: "os", ...breakdowns.os },
            ]}
          />
          {/* Country and language are two answers, not one. This panel was fed
              the locale breakdown under the name `countries` until the schema
              gave it real edge-header geography; they disagree often, and the
              pair of them is the point. */}
          <BreakdownPanel
            title="Countries"
            hint={BAR_BASIS_HINT}
            tabs={[
              {
                value: "countries",
                label: "Country",
                kind: "country",
                ...breakdowns.countries,
              },
            ]}
          />
          <BreakdownPanel
            title="Languages"
            hint={BAR_BASIS_HINT}
            tabs={[
              {
                value: "locales",
                label: "Language",
                kind: "locale",
                ...breakdowns.locales,
              },
            ]}
          />
          {/* Five dimensions, one card: campaign parameters are read together —
              which source, through which medium, for which campaign — and five
              cards of mostly-empty lists would bury the four panels above.
              Acquisition like the Sources card, so these count sessions too.

              Every tab here is scoped to the arrivals that carried the
              parameter it lists (BREAKDOWN_SCOPES, `empty: "omitted"`). The
              ones that carried none used to coalesce into a row labelled
              "Unknown" — on a normal site, nearly all of the traffic, sorted
              first, drawn as the bar every real campaign's share was measured
              against, with the site's whole audience in its Daily visitors
              column under a card headed Campaigns. */}
          <BreakdownPanel
            title="Campaigns"
            hint={CAMPAIGNS_HINT}
            tabs={[
              {
                value: "utm-source",
                label: "Source",
                kind: "campaign",
                ...breakdowns.utmSources,
              },
              {
                value: "utm-medium",
                label: "Medium",
                kind: "campaign",
                ...breakdowns.utmMediums,
              },
              {
                value: "utm-campaign",
                label: "Campaign",
                kind: "campaign",
                ...breakdowns.utmCampaigns,
              },
              {
                value: "utm-term",
                label: "Term",
                kind: "campaign",
                ...breakdowns.utmTerms,
              },
              {
                value: "utm-content",
                label: "Content",
                kind: "campaign",
                ...breakdowns.utmContents,
              },
            ]}
          />
          {/* Full width: its rows carry a line of revenue per currency, which
              the half-width cards have no room for. */}
          <div className="lg:col-span-2">
            <GoalsPanel rows={data.events} />
          </div>
        </div>
      </div>
    </div>
  );
}
