import { beforeEach, describe, expect, it, vi } from "vitest";
import * as metrics from "../metrics.server";
import {
  BREAKDOWN_DIMENSIONS,
  getUserWebsitesOverview,
  OVERVIEW_DAYS,
} from "../queries.server";

const { answers, statements } = vi.hoisted(() => ({
  /** SQL fragment identifying a query ⇒ the rows Postgres would answer with. */
  answers: new Map<string, unknown[]>(),
  statements: [] as { text: string; params: unknown[] }[],
}));

/**
 * The connection pool is the seam, not the query layer.
 *
 * Every metric is now a definition written in SQL — distinct visitors rather
 * than a per-row flag, sessions rather than events — so stubbing
 * `queries.server` would mock away the only place those definitions exist.
 * Replacing `pg` instead leaves drizzle, the schema and the query layer
 * entirely real: `statements` below is what the server would send to Postgres,
 * and `answers` is what Postgres would send back.
 *
 * `types` has to stay the real export — drizzle's node-postgres driver reads
 * `pg.types.builtins` while building the type parsers for every query.
 */
vi.mock("pg", async (importOriginal) => {
  const actual = await importOriginal<typeof import("pg")>();

  class RecordingPool {
    /** db.server installs an idle-client error handler on the pool. */
    on() {}

    query(config: { text: string }, params: unknown[] = []) {
      statements.push({ text: config.text, params });

      for (const [fragment, rows] of answers) {
        if (config.text.includes(fragment)) {
          return Promise.resolve({ rows });
        }
      }

      return Promise.resolve({ rows: [] });
    }
  }

  const Pool = RecordingPool as unknown as typeof actual.Pool;

  return { ...actual, default: { ...actual, Pool }, Pool };
});

beforeEach(() => {
  statements.length = 0;
  answers.clear();
});

/**
 * A fixture row is shaped like the statement that asks for it. Drizzle's query
 * builder asks for `rowMode: "array"` and maps positionally, so those take the
 * select list in order; the two statements written as `db.execute` (the
 * timeseries and the goals) come back as objects keyed by column name.
 */
const answer = (fragment: string, rows: unknown[]) =>
  answers.set(fragment, rows);

/** The single statement one metric call issues. */
async function statementFor(run: () => Promise<unknown>) {
  await run();

  expect(statements).toHaveLength(1);

  return statements[0];
}

/**
 * Every `date_trunc($n, … AT TIME ZONE $m)` in a statement, with its parameters
 * substituted. The bug class this whole module has been chasing is two
 * truncations that were supposed to be the same one and weren't.
 */
function truncations({ text, params }: { text: string; params: unknown[] }) {
  return [
    ...text.matchAll(/date_trunc\(\$(\d+), [^)]*AT TIME ZONE \$(\d+)\)/g),
  ].map(([, unit, tz]) => [params[Number(unit) - 1], params[Number(tz) - 1]]);
}

const window = { start: Date.UTC(2026, 0, 1), end: Date.UTC(2026, 0, 31) };

/**
 * A `created_at` bound in a statement's WHERE clause, resolved through the
 * parameter it is bound to — the bound is what the window's length *is*, and
 * reading it positionally out of the parameter list would depend on where else
 * in the statement a timestamp happens to appear.
 */
function boundAt(
  statement: { text: string; params: unknown[] } | undefined,
  op: string
) {
  const at = new RegExp(`"events"\\."created_at" ${op} \\$(\\d+)`).exec(
    statement?.text ?? ""
  );

  return at ? Date.parse(String(statement?.params[Number(at[1]) - 1])) : NaN;
}

describe("timeseries", () => {
  it("labels a naive bucket as UTC whatever the server's zone is", async () => {
    // A bucket is `timestamp without time zone` — the wall clock in the zone
    // the caller asked for, which the driver hands over as a naive string with
    // no offset on it. `new Date("2026-01-02 00:00:00")` would read that in the
    // *host's* zone and shift every label; the query layer pins it to UTC.
    answer("generate_series(", [
      { ts: "2026-01-01 00:00:00", count: 0 },
      { ts: "2026-01-02 00:00:00", count: 7 },
      { ts: "2026-01-03 00:00:00", count: 0 },
    ]);

    const tokyo = process.env.TZ;

    // The suite is pinned to TZ=UTC, under which a host-zone leak is invisible
    // by construction. Servers are not all UTC and the design's whole claim is
    // that it does not matter, so this case states it where it can fail.
    process.env.TZ = "Asia/Tokyo";

    try {
      const points = await metrics.timeseries("wid", {
        start: Date.UTC(2026, 0, 1),
        end: Date.UTC(2026, 0, 3),
        unit: "day",
        tz: "UTC",
      });

      expect(points.map((point) => point.timeseries)).toEqual([
        "2026-01-01T00:00:00.000Z",
        "2026-01-02T00:00:00.000Z",
        "2026-01-03T00:00:00.000Z",
      ]);
      expect(points.map((point) => point.count)).toEqual([0, 7, 0]);
    } finally {
      process.env.TZ = tokyo;
    }
  });

  it("un-shifts a bucket a driver change would parse in the host's zone", async () => {
    // drizzle's node-postgres session overrides the type parser for OID 1114
    // and hands back the raw string, which is why the branch above is the one
    // that runs. Raw pg parses it in the host's zone instead, so a driver swap
    // or a custom `types` option would deliver a Date that is silently an hour
    // (or nine) off. Reading its local fields back out is what undoes that.
    const tokyo = process.env.TZ;

    process.env.TZ = "Asia/Tokyo";

    try {
      answer("generate_series(", [
        { ts: new Date("2026-01-02T00:00:00"), count: 5 },
      ]);

      const [point] = await metrics.timeseries("wid", {
        start: Date.UTC(2026, 0, 1),
        end: Date.UTC(2026, 0, 3),
        unit: "day",
        tz: "UTC",
      });

      expect(point.timeseries).toBe("2026-01-02T00:00:00.000Z");
    } finally {
      process.env.TZ = tokyo;
    }
  });

  it("generates the empty buckets from the expression that counts them", async () => {
    // The padding used to be stepped in JS from a zone offset this process
    // derived itself, which is a second implementation of Postgres' calendar:
    // it returned NaN for 37 zones (blank chart), and it sampled one offset for
    // the whole window, so a window containing a DST change generated a series
    // that stopped one bucket short and the newest bucket's views were dropped.
    // Both sides now truncate through the same expression on the same
    // parameters, which is the property that makes a disagreement impossible.
    const statement = await statementFor(() =>
      metrics.timeseries("wid", { ...window, unit: "day", tz: "Europe/Rome" })
    );

    expect(statement.text).toContain("generate_series(");
    expect(truncations(statement)).toEqual([
      ["day", "Europe/Rome"],
      ["day", "Europe/Rome"],
      ["day", "Europe/Rome"],
    ]);
    // And the step is the same unit again, so a bucket is a local day rather
    // than a fixed 86_400_000ms that a transition knocks off the hour.
    expect(statement.text).toContain(`('1 ' || $`);
  });

  it("asks for a half-open window, the same one the statistics use", async () => {
    const { text } = await statementFor(() =>
      metrics.timeseries("wid", {
        start: 0,
        end: 1_000,
        unit: "hour",
        tz: "UTC",
      })
    );

    expect(text).toContain(`"events"."created_at" >= $`);
    expect(text).toContain(`"events"."created_at" < $`);
    expect(text).not.toContain(`"events"."created_at" <= $`);
  });

  it("rejects a unit it cannot bucket", async () => {
    await expect(
      metrics.timeseries("wid", {
        start: Date.UTC(2026, 0, 1),
        end: Date.UTC(2026, 0, 2),
        unit: "fortnight",
        tz: "UTC",
      })
    ).rejects.toThrow(/Invalid unit/);
  });

  it("rejects a numeric zone, which the two sides sign oppositely", async () => {
    // Intl reads `+05:30` as UTC+05:30 and Postgres reads it as UTC-05:30,
    // because a bare numeric zone is POSIX. Nothing downstream can reconcile
    // the two, and no picker and no browser produces one, so it is not a zone.
    await expect(
      metrics.timeseries("wid", { ...window, unit: "day", tz: "+05:30" })
    ).rejects.toThrow(/Invalid time zone/);

    await expect(
      metrics.timeseries("wid", { ...window, unit: "day", tz: "Asia/Kolkata" })
    ).resolves.toEqual([]);
  });
});

describe("breakdowns", () => {
  it("fills a panel for every breakdown the dashboard declares", async () => {
    const panels = await metrics.breakdowns("wid", window);

    expect(Object.keys(panels)).toEqual([...BREAKDOWN_DIMENSIONS]);
    expect(statements).toHaveLength(BREAKDOWN_DIMENSIONS.length);
  });

  it("groups the country panel on geography and the locale panel on language", async () => {
    // The bug this schema change exists to fix: `countries` was fed the locale
    // breakdown, so the panel was a list of browser languages wearing a flag.
    await metrics.breakdowns("wid", window);

    const columns = statements.map(
      (statement) => /coalesce\("(\w+)"/.exec(statement.text)?.[1]
    );

    expect(columns).toContain("country");
    expect(columns).toContain("locale");
  });

  it("resolves locale tags to a language and its region", async () => {
    answer(`coalesce("locale"`, [["en-US", 5, 3]]);

    const { locales } = await metrics.breakdowns("wid", window);

    expect(locales.rows).toEqual([
      { element: "English (United States)", count: 5, unique: 3 },
    ]);
  });

  it("leaves a language tag with no region unqualified", async () => {
    answer(`coalesce("locale"`, [["en", 1, 1]]);

    const { locales } = await metrics.breakdowns("wid", window);

    expect(locales.rows[0].element).toBe("English");
  });

  it("falls back to the raw tag for unknown locales", async () => {
    answer(`coalesce("locale"`, [
      ["zz-ZZ", 1, 1],
      ["", 1, 1],
    ]);

    const { locales } = await metrics.breakdowns("wid", window);

    // The empty bucket is the one the panels label "Unknown"; it has to survive
    // the mapping rather than become the string "undefined".
    expect(locales.rows.map((row) => row.element)).toEqual(["zz-ZZ", ""]);
  });

  it("passes every other dimension through untouched", async () => {
    answer(`coalesce("browser"`, [["Chrome", 4, 2]]);
    // Raw ISO-3166; names and flags are the dashboard's to render, and the
    // panel must not be handed a locale-codes location by mistake again.
    answer(`coalesce("country"`, [["US", 4, 2]]);

    const panels = await metrics.breakdowns("wid", window);

    expect(panels.browsers.rows).toEqual([
      { element: "Chrome", count: 4, unique: 2 },
    ]);
    expect(panels.countries.rows).toEqual([
      { element: "US", count: 4, unique: 2 },
    ]);
  });

  it("groups the channel panel that nothing used to ask for", async () => {
    // Resolved at ingest since the schema change and rendered nowhere: direct /
    // search / social / referral / campaign is the one acquisition view that is
    // complete, because every arrival lands in exactly one of the five.
    answer(`coalesce("channel"`, [["search", 9, 8]]);

    const { channels } = await metrics.breakdowns("wid", window);

    expect(channels).toEqual({
      unit: "sessions",
      rows: [{ element: "search", count: 9, unique: 8 }],
    });
  });
});

/**
 * Acquisition is a property of an arrival.
 *
 * `referrer_host` is only ever set on the pageview that opened a visit — the
 * tracker reads `document.referrer` once per document, and ingest nulls
 * self-referrals — and `channel` is derived per event from that same referrer,
 * so pageviews 2..N are classified `direct` for the same reason. Grouped over
 * every pageview in the window these reported close to the opposite of the
 * truth: measured on a 494k-pageview / 240k-session fixture at the 30 day
 * preset, the empty referrer bucket held 66.3% of the panel against a real 30.0%
 * and google.com's share was 10.7% against a real 22.2%, with `channel` calling
 * 65% of traffic direct where 25.5% of visits were.
 */
describe("acquisition scope", () => {
  /** The dimensions whose value only exists on the session's first pageview. */
  const ACQUISITION = [
    "referrers",
    "channels",
    "utmSources",
    "utmMediums",
    "utmCampaigns",
    "utmTerms",
    "utmContents",
  ] as const;

  /** Facts about the view itself, recorded on every one of them. */
  const TECHNOLOGY = [
    "pages",
    "browsers",
    "os",
    "devices",
    "countries",
    "locales",
  ] as const;

  it("covers every dimension the dashboard declares", () => {
    // A dimension added to `Breakdowns` and left out of both lists would
    // otherwise be a panel nothing in this file has an opinion about.
    expect(new Set([...ACQUISITION, ...TECHNOLOGY])).toEqual(
      new Set(BREAKDOWN_DIMENSIONS)
    );
  });

  it("counts arrivals for the acquisition dimensions and views for the rest", async () => {
    const panels = await metrics.breakdowns("wid", window);

    for (const dimension of ACQUISITION) {
      expect(panels[dimension].unit).toBe("sessions");
    }

    for (const dimension of TECHNOLOGY) {
      expect(panels[dimension].unit).toBe("views");
    }
  });

  it("scopes exactly those dimensions to the session's first pageview", async () => {
    await metrics.breakdowns("wid", window);

    // is_new_session is set by ingest on a session's opening pageview and
    // nowhere else — custom events never carry it — so it *is* the arrival.
    const scoped = statements
      .filter((statement) => statement.text.includes(`"is_new_session" = $`))
      .map((statement) => /coalesce\("(\w+)"/.exec(statement.text)?.[1]);

    expect(new Set(scoped)).toEqual(
      new Set([
        "channel",
        "referrer_host",
        "utm_campaign",
        "utm_content",
        "utm_medium",
        "utm_source",
        "utm_term",
      ])
    );
    expect(scoped).toHaveLength(ACQUISITION.length);
    expect(statements).toHaveLength(BREAKDOWN_DIMENSIONS.length);
  });

  it("leaves the technology dimensions counting pageviews", async () => {
    await metrics.breakdowns("wid", window);

    const unscoped = statements
      .filter((statement) => !statement.text.includes("is_new_session"))
      .map((statement) => /coalesce\("(\w+)"/.exec(statement.text)?.[1]);

    // Which pages were read, on which browser, from where. Those are facts
    // about the view, they are on every row, and narrowing them to arrivals
    // would throw away the answer rather than correct it.
    expect(new Set(unscoped)).toEqual(
      new Set(["browser", "country", "device", "locale", "os", "path"])
    );
    expect(unscoped).toHaveLength(TECHNOLOGY.length);
  });

  it("keeps the type qual on the acquisition panels too", async () => {
    // is_new_session is in no index and must stay out of one (ADDENDUM v2 §D:
    // an index over it would cost this table its HOT updates). It is a heap
    // filter on rows the (website_id, type, created_at) range scan has already
    // fetched, which only holds while `type` is still named — measured warm on
    // 494k pageviews: 7d 25.3ms -> 19.2ms, identical bitmap index scan and
    // identical 2341 buffers, with the filter removing 27159 of 52358 rows.
    await metrics.breakdowns("wid", window);

    for (const { text, params } of statements) {
      expect(text).toContain(`"events"."type" = $`);
      expect(params).toContain("pageview");
    }
  });
});

/**
 * Null is an answer for most dimensions and the absence of one for the five utm
 * columns, and the difference is what the Campaigns card is a list of.
 *
 * Grouped with the rest, every visit that arrived without campaign parameters —
 * on a normal site, nearly all of them — collapsed into one bucket the panel
 * labelled "Unknown". It sorted first, so it was also the bar every real
 * campaign's share was drawn against; its Daily visitors column was the site's
 * whole audience under a card headed Campaigns; and the word invited the reader
 * to take "arrived without a campaign" for "a campaign we could not attribute".
 */
describe("the empty bucket", () => {
  const OMITTED = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  const COUNTED = [
    "path",
    "referrer_host",
    "channel",
    "browser",
    "os",
    "device",
    "country",
    "locale",
  ];

  /** The column each statement groups on, in the order the panels are asked. */
  const columnsOf = () =>
    statements.map(
      (statement) => /coalesce\("(\w+)"/.exec(statement.text)?.[1] ?? ""
    );

  it("drops it from the campaign dimensions and keeps it everywhere else", async () => {
    await metrics.breakdowns("wid", window);

    const filtered = statements
      .map(
        (statement) =>
          /coalesce\("events"\."(\w+)", ''\) <> ''/.exec(statement.text)?.[1]
      )
      .filter((column): column is string => column !== undefined);

    expect(new Set(filtered)).toEqual(new Set(OMITTED));
    expect(new Set(columnsOf())).toEqual(new Set([...OMITTED, ...COUNTED]));
  });

  it("filters on the same expression the bucket is grouped by", async () => {
    await metrics.breakdowns("wid", window);

    // `is not null` would be a second spelling of the bucket, and the two
    // disagree about a legacy row holding '' — which the panel would then draw
    // as the empty bucket the filter exists to remove.
    for (const { text } of statements) {
      expect(text).not.toContain("is not null");
    }

    // And it is the bucket's own expression, so the two cannot drift: the
    // column the filter names is the column the panel groups on, every time.
    const pairs = statements
      .map(({ text }) => ({
        bucket: /coalesce\("(\w+)", ''\) as "element"/.exec(text)?.[1],
        filtered: /coalesce\("events"\."(\w+)", ''\) <> ''/.exec(text)?.[1],
      }))
      .filter((pair) => pair.filtered !== undefined);

    expect(pairs).toHaveLength(OMITTED.length);
    expect(pairs.map((pair) => pair.filtered)).toEqual(
      pairs.map((pair) => pair.bucket)
    );
  });

  it("leaves the utm panels counting sessions", async () => {
    // The scope is unchanged: still one row per arrival, now only the arrivals
    // that carried the parameter the panel lists.
    answer(`coalesce("utm_source"`, [["newsletter", 9, 8]]);

    const { utmSources } = await metrics.breakdowns("wid", window);

    expect(utmSources).toEqual({
      unit: "sessions",
      rows: [{ element: "newsletter", count: 9, unique: 8 }],
    });
  });
});

/**
 * The websites index says "last {days} days" over its figures, and it was six
 * whole UTC days plus however much of the current one had elapsed: 145 hours at
 * 01:00 UTC against a label that claims 168, and a different quantity from the
 * dashboard's "Last 7 days" preset, so clicking a row led to a Pageviews tile
 * that disagreed with the row it was clicked from.
 */
describe("websites overview", () => {
  // Positional, because drizzle's query builder asks for rowMode: "array" —
  // id, name, url, is_public, user_id, created_at, updated_at.
  const site = [
    "w1",
    "A",
    "https://a.dev",
    false,
    "u1",
    new Date(),
    new Date(),
  ];

  const overviewStatement = () =>
    statements.find((statement) => statement.text.includes("grouping sets"));

  it("bounds the window at both ends, seven whole days apart", async () => {
    answer(`from "websites"`, [site]);

    await getUserWebsitesOverview("u1");

    const statement = overviewStatement();

    expect(statement).toBeDefined();

    // There was no upper bound at all, which is what let the window's length
    // follow the clock instead of the label: 145 hours at 01:00 UTC, 168 only
    // in the last second before midnight.
    expect(boundAt(statement, ">=")).toBeLessThan(boundAt(statement, "<"));
    expect(boundAt(statement, "<") - boundAt(statement, ">=")).toBe(
      OVERVIEW_DAYS * 86_400_000
    );
  });

  it("buckets in whole 24 hour steps back from the window's own end", async () => {
    answer(`from "websites"`, [site]);

    await getUserWebsitesOverview("u1");

    // Not date_trunc: a UTC-day bucketing of a rolling window makes the newest
    // bar a part-day stub, which draws a fall in traffic that did not happen.
    expect(overviewStatement()?.text).toContain("/ 86400");
    expect(overviewStatement()?.text).not.toContain("date_trunc");
  });

  it("takes the totals from the grouping rather than adding the buckets up", async () => {
    answer(`from "websites"`, [site]);
    answer("grouping sets", [
      {
        website_id: "w1",
        bucket: 0,
        is_total: 0,
        views: 3,
        visitors: 3,
        last: null,
      },
      {
        website_id: "w1",
        bucket: 6,
        is_total: 0,
        views: 1,
        visitors: 1,
        last: null,
      },
      {
        website_id: "w1",
        bucket: null,
        is_total: 1,
        views: 4,
        // Deliberately below the sum of the buckets: a visitor_id is unique to
        // a UTC date and a rolling bucket boundary falls inside one, so the
        // same reader can appear in two buckets. Adding the per-bucket distinct
        // counts would count them twice; the window-wide count is exact.
        visitors: 3,
        last: "2026-08-04T09:00:00.000Z",
      },
    ]);

    const [overview] = await getUserWebsitesOverview("u1");

    expect(overview.views).toBe(4);
    expect(overview.visitors).toBe(3);
    expect(overview.spark).toEqual([1, 0, 0, 0, 0, 0, 3]);
    expect(overview.spark.reduce((a, b) => a + b, 0)).toBe(overview.views);
    expect(overview.lastEventAt?.toISOString()).toBe(
      "2026-08-04T09:00:00.000Z"
    );
  });

  it("gives a site with no traffic a full row of empty buckets", async () => {
    answer(`from "websites"`, [site]);

    const [overview] = await getUserWebsitesOverview("u1");

    expect(overview.spark).toHaveLength(OVERVIEW_DAYS);
    expect(overview.spark.every((value) => value === 0)).toBe(true);
    expect(overview.views).toBe(0);
    expect(overview.lastEventAt).toBeNull();
  });
});

/**
 * What the numbers mean. Postgres computes them, so the statement it is handed
 * is where the definition lives and the only thing there is to assert.
 *
 * The figures quoted below were measured against Postgres 16 on a fixture of
 * nine pageviews and two custom events: one visitor returning on three separate
 * days, one three-page session, one session whose bounce flag was never
 * cleared, and a custom event carrying its own visitor, session and duration.
 */
describe("metric semantics", () => {
  it("counts unique visitors as distinct ids, not rows carrying a flag", async () => {
    const { text } = await statementFor(() =>
      metrics.statistics("wid", window)
    );

    expect(text).toContain(`count(DISTINCT "visitor_id")::int`);
    // is_new_visitor means "first hit of this visitor's UTC day". Counting the
    // rows that carry it made the returning reader three visitors, and grew the
    // headline number with the length of the window instead of the audience:
    // 4 against the fixture's 2.
    expect(text).not.toContain("is_new_visitor");
  });

  it("counts bounces in sessions, so the rate divides by a like quantity", async () => {
    const { text } = await statementFor(() =>
      metrics.statistics("wid", window)
    );

    expect(text).toContain(`count(DISTINCT "session_id")::int`);
    expect(text).toContain(
      `count(DISTINCT "session_id") FILTER (WHERE "is_a_bounce")::int`
    );
    // Numerator and denominator both count sessions, so the ratio cannot exceed
    // one. Counting flagged rows against sessions could and did: a single
    // session that kept a stale flag on three pageviews reported 6 bounces over
    // 5 sessions on the fixture — a bounce rate of 120%.
    expect(text).not.toContain(`count(*) FILTER (WHERE "is_a_bounce")`);
    expect(text).not.toContain("is_new_session");
  });

  it("averages visit duration over sessions rather than over pageviews", async () => {
    const { text } = await statementFor(() =>
      metrics.statistics("wid", window)
    );

    expect(text).toContain(
      `sum("duration") / nullif(count(DISTINCT "session_id") FILTER (WHERE "duration" IS NOT NULL), 0)`
    );
    // A five-page visit is one visit. avg() over rows weighted every session by
    // how many pages it had and reported 1800ms where the fixture's sessions
    // averaged 3000ms. The FILTER is what keeps a session whose beacon never
    // arrived out of the denominator instead of scoring it zero.
    expect(text).not.toContain(`avg("duration")`);
  });

  it("asks Postgres for pageviews only, everywhere but the goals panel", async () => {
    await metrics.statistics("wid", window);
    await metrics.timeseries("wid", { ...window, unit: "day", tz: "UTC" });
    await metrics.breakdowns("wid", window);

    expect(statements).toHaveLength(2 + BREAKDOWN_DIMENSIONS.length);

    for (const { text, params } of statements) {
      // Naming `type` is not only what stops a site's own aurora() calls from
      // inflating its pageview count. The dashboard index is
      // (website_id, type, created_at) and Postgres 16 has no skip scan, so
      // leaving the qual out demotes it to a heap filter over the whole window.
      expect(text).toContain(`"events"."type" = $`);
      expect(params).toContain("pageview");
    }
  });

  it("counts distinct visitors by grouping on them, not by ordering them", async () => {
    await metrics.breakdowns("wid", window);

    const { text } = statements[0];

    // A DISTINCT aggregate is an *ordered* aggregate, and one of those turns
    // off hash aggregation and parallelism for the whole node: every panel
    // became a GroupAggregate over a full sort of the window, spilling to disk,
    // twelve times per render. Grouping by (element, visitor_id) and counting
    // the groups is the same question asked in a shape Postgres can hash —
    // measured at 125ms to 25ms per panel on 588k events at the 7 day preset.
    expect(text).toContain(`group by 1, 2`);
    expect(text).toContain(`count(*)::int`);
    expect(text).not.toContain(`count(DISTINCT`);
  });

  it("keeps a revenue total per currency instead of adding them together", async () => {
    answer("jsonb_agg(", [
      {
        name: "checkout",
        count: 3,
        unique: 2,
        revenue: [
          { currency: "EUR", total: 49 },
          { currency: "USD", total: 10 },
        ],
      },
    ]);

    const [goal] = await metrics.customEvents("wid", window);

    // 49.00 EUR + 10.00 USD was reported as one figure of 59, which is a
    // quantity in no unit at all: ingest stores `currency` next to every
    // amount, and the row it fed carried no way to tell that it had been lost.
    expect(goal.revenue).toEqual([
      { currency: "EUR", total: 49 },
      { currency: "USD", total: 10 },
    ]);
  });

  it("counts custom events on their own, which is why nothing else counts them", async () => {
    const { text, params } = await statementFor(() =>
      metrics.customEvents("wid", window)
    );

    expect(params).toContain("event");
    expect(params).not.toContain("pageview");
    // revenue is numeric(14,2) and sum(numeric) arrives from pg as a string, so
    // the annotation is a claim and the cast is the conversion. Without it the
    // dashboard adds "49.00" to a total by concatenating it.
    expect(text).toContain(`sum("events"."revenue")::float8`);
    // Grouped by the currency as well as the goal, which is what makes the
    // per-currency totals above possible rather than a JS-side guess.
    expect(text).toContain(`"events"."currency" as currency`);
  });

  it("bounds every panel so an unbounded tail cannot be serialised into the page", async () => {
    const { text, params } = await statementFor(() =>
      metrics.customEvents("wid", window)
    );

    expect(text).toContain("limit $");
    // Ordering by count alone leaves the rows at the cut in an order Postgres
    // is free to change, and the panel reshuffles between two renders of the
    // same window.
    expect(text).toContain("order by count(*) desc, 1 asc");
    expect(params).toContain(100);
  });

  it("keeps a zero bound instead of dropping the predicate that carries it", async () => {
    const { text, params } = await statementFor(() =>
      metrics.statistics("wid", { start: -1_000, end: 0 })
    );

    // `0` is a real epoch millisecond and a falsy JS number. Testing the raw
    // value for truthiness dropped the bound, so `?from=-1000&to=0` asked for
    // one second of 1970 and was answered with the site's lifetime totals —
    // anonymously, on the public dashboard, past the loader's span cap.
    expect(text).toContain(`"events"."created_at" < $`);
    expect(params).toContain(new Date(0).toISOString());
    expect(params).toContain(new Date(-1_000).toISOString());
  });

  it("bounds every window half-open, so two adjacent windows tile it", async () => {
    const { text } = await statementFor(() =>
      metrics.statistics("wid", window)
    );

    // The comparison window ends exactly where this one starts. While both
    // ends were inclusive, an event landing on that instant was counted in
    // both, and every trend arrow was a comparison of overlapping sets.
    expect(text).toContain(`"events"."created_at" >= $`);
    expect(text).toContain(`"events"."created_at" < $`);
    expect(text).not.toContain(`"events"."created_at" <= $`);
  });
});
