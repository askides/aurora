/**
 * Shapes shared between loaders and components. Kept out of the .server modules
 * so client components can import them without reaching into server-only code.
 */

/**
 * What a panel's first numeric column counts, and therefore what its header has
 * to say.
 *
 * Acquisition is a property of an *arrival*. `referrer_host` is only ever set on
 * the pageview that opened a visit — the tracker reads `document.referrer` once
 * per document, and ingest nulls self-referrals — and `channel` is resolved
 * per-event from that same referrer, so pageviews 2..N are classified `direct`
 * for the same reason. Scoped to every pageview, those dimensions answered a
 * question nobody asked: a site whose visitors all arrive from google.com and
 * read five pages reported `google.com 100 / <empty> 400`, understating every
 * real referrer's share in proportion to pages-per-visit. They are now scoped to
 * `is_new_session`, which makes them per-session counts.
 *
 * Everything else is a property of the page that was viewed and still counts
 * pageviews. The unit travels with the rows rather than being restated at each
 * call site, because a panel whose header and scope are set in two places is a
 * panel that can be mislabelled — which is the defect this exists to remove.
 */
export type BreakdownUnit = "views" | "sessions";

export type BreakdownRow = {
  element: string;
  /**
   * In the panel's own `unit`. Named `views` while every dimension was scoped to
   * pageviews, which is exactly the assumption that stopped holding.
   */
  count: number;
  /**
   * Distinct visitors — `count(DISTINCT visitor_id)`. It used to be
   * `count(*) FILTER (WHERE is_new_visitor)`, a per-row flag that grew with the
   * length of the window instead of with the audience. The name stays because
   * every panel already keys off it.
   */
  unique: number;
};

/** One panel: its rows and the unit they are counted in, never one without the other. */
export type Breakdown<Unit extends BreakdownUnit = BreakdownUnit> = {
  unit: Unit;
  rows: BreakdownRow[];
};

export type TimeseriesPoint = { timeseries: string; count: number };

/** One bucket as returned by Postgres, before gaps are padded. */
export type TimeseriesRow = { ts: Date; count: number };

export type Statistics = {
  /** Pageviews only, so custom events cannot inflate the headline number. */
  visits: number;
  /** Distinct visitor_id — the same correction as `BreakdownRow.unique`. */
  uniqueVisits: number;
  /** Distinct session_id, not the count of rows flagged is_new_session. */
  sessions: number;
  /** Sessions with a single pageview; the numerator of the bounce rate, whose
   * denominator is `sessions`. Kept as the two inputs rather than a ratio so
   * the dashboard can compare windows without dividing twice. */
  bounces: number;
  /**
   * Averaged per session, not per event: a five-page visit is one visit.
   *
   * Null when no pageview in the window carried a duration at all — an install
   * whose beacons are blocked, or a window of pages nobody stayed on long
   * enough to report. That is not an average of zero, and flattening it to one
   * made the dashboard state a measurement it never took.
   */
  avgDuration: number | null;
};

/**
 * The dashboard panels. Each is one grouped scan over `events` now that the
 * dimensions are columns, so adding a panel costs a query and nothing else.
 *
 * The unit is written into each panel's type rather than left to the query
 * layer's discretion: `BREAKDOWN_SCOPES` in queries.server.ts is checked against
 * this declaration, so scoping a dimension to arrivals without saying so here —
 * or saying so here without scoping it — does not compile.
 */
export type Breakdowns = {
  pages: Breakdown<"views">;
  /**
   * The host a visit arrived from, once per visit. The empty bucket is a visit
   * whose first pageview carried no external referrer.
   */
  referrers: Breakdown<"sessions">;
  /**
   * Direct / search / social / referral / campaign, resolved once per event at
   * ingest and read here only off the event that opened the visit. Computed
   * since the schema change and rendered nowhere until now.
   */
  channels: Breakdown<"sessions">;
  browsers: Breakdown<"views">;
  os: Breakdown<"views">;
  devices: Breakdown<"views">;
  /** Edge-header geography. Until now this panel was fed the locale instead. */
  countries: Breakdown<"views">;
  locales: Breakdown<"views">;
  utmSources: Breakdown<"sessions">;
  utmMediums: Breakdown<"sessions">;
  utmCampaigns: Breakdown<"sessions">;
  utmTerms: Breakdown<"sessions">;
  utmContents: Breakdown<"sessions">;
};

/** What one goal earned in one currency. Never merged with another currency. */
export type EventRevenue = { currency: string; total: number };

/**
 * One goal: a named event the site fires itself through `aurora()`.
 *
 * Declared here rather than imported from the query layer that produces it, for
 * the reason at the top of this file — the goals panel is a client component
 * and the producer is a `.server` module. The loader's rows are assigned to
 * this shape at the dashboard's prop boundary, so a producer that stopped
 * carrying `revenue`, or carried it as a single number again, fails to compile
 * here rather than rendering wrong.
 */
export type CustomEventRow = {
  name: string;
  count: number;
  /** Distinct visitors — the same daily-rotation caveat as everywhere else. */
  unique: number;
  /** One total per currency, largest first; empty when the goal earns nothing. */
  revenue: EventRevenue[];
};

export type Website = {
  id: string;
  name: string;
  url: string;
  is_public: boolean;
  user_id: string;
  created_at: Date;
  updated_at: Date;
};
