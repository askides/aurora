import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserWebsitesOverview, OVERVIEW_DAYS } from "../queries.server";

const { answers, statements } = vi.hoisted(() => ({
  /** SQL fragment identifying a query ⇒ the rows Postgres would answer with. */
  answers: new Map<string, unknown[]>(),
  statements: [] as { text: string; params: unknown[] }[],
}));

/**
 * The connection pool is the seam, not the query layer — the same arrangement
 * the analytics suite uses, and deliberately duplicated rather than shared:
 * `vi.mock` is hoisted per file, so a helper module would have to be imported
 * before the module under test to avoid a TDZ error, which is a load-bearing
 * import order nothing in the file would explain.
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

const answer = (fragment: string, rows: unknown[]) =>
  answers.set(fragment, rows);

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
