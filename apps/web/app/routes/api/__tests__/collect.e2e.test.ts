/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://shop.example/" }
 *
 * The one test in this repository that mocks nothing.
 *
 * Every other suite verifies one half of the pipeline against a stand-in for
 * the other: collect.test.ts boots the tracker *source* against a fake data
 * layer, metrics.test.ts drives the real SQL against a fake connection pool,
 * and the tracker's own suite reads its beacons off a stubbed `sendBeacon`.
 * Each of those is worth having and none of them can see the seams between
 * them — a build that mangles a field name, a migration that never ran, a
 * column the insert writes and no query reads, a definition that means one
 * thing in JS and another in SQL. All of those read fine on both sides.
 *
 * So this one runs the whole path exactly once per journey, with nothing
 * substituted:
 *
 *   `pnpm --filter tracker build` -> the emitted apps/web/public/tracker.js,
 *   loaded in jsdom -> the beacons it actually sends -> the real `action` from
 *   collect.ts and collect.duration.ts -> a real Postgres carrying the real
 *   migrations -> `metrics.statistics`, `.breakdowns`, `.timeseries` and
 *   `.customEvents` -> the numbers a dashboard would print.
 *
 * The bundle and not the TypeScript, deliberately. The bundle is what ships;
 * minification renames every local in this file's protocol and a source-only
 * test cannot see a build that emitted the wrong one.
 *
 * It runs against a scratch database created for the run and dropped
 * afterwards, never against the developer's own: the connection string is only
 * used to `CREATE DATABASE ... TEMPLATE template0` beside it, and every write
 * below happens inside the copy. With no database reachable at all the whole
 * suite skips with an explanation, so `pnpm test` still passes for someone
 * without Docker running.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { events } from "~/db/schema";
import { limiter } from "~/modules/ingest/ratelimit.server";
import { asc, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * `new URL(x, import.meta.url)` is rewritten by Vite into an asset URL, which
 * is an https one under this environment's jsdom origin. The path has to be
 * taken off `import.meta.url` itself.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../../..");
const WEB = resolve(HERE, "../../../..");
const BUNDLE = resolve(WEB, "public/tracker.js");
const MIGRATIONS = resolve(WEB, "app/db/migrations");
const ENV_FILE = resolve(WEB, ".env");

/**
 * Where the scratch database is created, which is the one thing here that has
 * to come from outside.
 *
 * `apps/web/.env` is read first and read the way every other command in this
 * repo reads it, because that file is what `pnpm dev`, `db:migrate` and
 * `db:seed` all connect through — a suite that ignored it would skip on the
 * machine of everyone whose Postgres is not on the default port. `loadEnvFile`
 * leaves an already-set variable alone and test/setup.ts has always already set
 * one, hence the delete.
 *
 * AURORA_TEST_DATABASE_URL outranks it, for a CI service container or a second
 * server someone would rather this ran against.
 */
function serverUrl(): string {
  const inherited = process.env.DATABASE_URL;

  if (existsSync(ENV_FILE)) {
    delete process.env.DATABASE_URL;
    process.loadEnvFile(ENV_FILE);
  }

  return (
    process.env.AURORA_TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    inherited ??
    ""
  );
}

const SERVER_URL = serverUrl();

/** Null when the server answered, otherwise why it did not. */
async function unreachable(url: string): Promise<string | null> {
  if (!url) {
    return "no DATABASE_URL to connect to";
  }

  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 3_000,
  });

  try {
    await client.connect();

    return null;
  } catch (error) {
    // A refused connection arrives as an AggregateError whose own message is
    // empty and whose `errors` holds one entry per address the host resolved
    // to, so the readable half is a level down.
    const failure = error as {
      message?: string;
      errors?: Array<{ message?: string }>;
    };

    return (
      failure.message ||
      failure.errors?.map((entry) => entry.message).join("; ") ||
      String(error)
    );
  } finally {
    await client.end().catch(() => {});
  }
}

const REASON = await unreachable(SERVER_URL);

if (REASON !== null) {
  console.warn(
    `[collect.e2e] skipped: no Postgres at ${SERVER_URL || "<unset>"} (${REASON}).\n` +
      "  This suite needs a real database. Start one with `docker compose up -d --wait`,\n" +
      "  or point AURORA_TEST_DATABASE_URL at a server it may create a scratch database on."
  );
}

const e2e = REASON === null ? describe : describe.skip;

/** The database this run owns, and drops. Never the one in DATABASE_URL. */
const SCRATCH = `aurora_e2e_${randomBytes(6).toString("hex")}`;

function scratchUrl(): string {
  const url = new URL(SERVER_URL);

  url.pathname = `/${SCRATCH}`;

  return url.href;
}

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/** The site every journey below reports to, and the page the tracker runs on. */
const SITE_URL = "https://shop.example";

/**
 * The collector, on an origin of its own — which is the deployment the CORS
 * code is written for, and the only way the beacon URLs the tracker derives
 * from `script.src` are visible as URLs at all.
 */
const SRC = "https://collect.aurora.test/aurora/tracker.js";
const COLLECT = "https://collect.aurora.test/aurora/collect";
const DURATION = "https://collect.aurora.test/aurora/collect/duration";

type Beacon = { url: string; body: Record<string, unknown> };

/** Who a set of beacons is delivered as; one visitor is one address here. */
type Visitor = { ip: string; ua?: string; country?: string };

let admin: Client;
// Imported dynamically and separately: db.server reads DATABASE_URL at import,
// and the two query modules are owned by different features.
let database: typeof import("~/shared/lib/db.server");
let users: typeof import("~/modules/auth/queries.server");
let sites: typeof import("~/modules/websites/queries.server");
let metrics: typeof import("~/modules/analytics/metrics.server");
let collect: typeof import("../collect");
let duration: typeof import("../collect.duration");
let user: { id: string };

type CollectArgs = Parameters<(typeof import("../collect"))["action"]>[0];
type DurationArgs = Parameters<
  (typeof import("../collect.duration"))["action"]
>[0];

/** The window every panel below is asked for; wide enough for the 31-minute
 * backdate the returning-visitor journey needs, tight enough to be a window. */
const WINDOW = {
  start: Date.now() - 6 * 3_600_000,
  end: Date.now() + 3_600_000,
};

/** One macrotask, which is what the tracker coalesces a navigation into. */
const tick = () =>
  new Promise<void>((done) => {
    setTimeout(done, 0);
  });

/** An `aurora()` call, made the way a customer's page makes one. */
const fire = (name: string, options?: unknown) => {
  (window as unknown as { aurora: (n: string, o?: unknown) => void }).aurora(
    name,
    options
  );
};

/** A route's own action, called with the args React Router would give it. */
const run = <T>(handler: (args: T) => unknown, request: Request) =>
  handler({ request, params: {}, context: {} } as T) as Promise<Response>;

/** The pageviews a chart would draw, however the buckets fall. */
const views = (points: Array<{ count: number }>) =>
  points.reduce((total, point) => total + point.count, 0);

e2e("a beacon's whole journey", () => {
  beforeAll(async () => {
    // The bundle under test is built from the source in this working tree
    // rather than assumed to be current: a stale public/tracker.js would make
    // every assertion below a statement about whatever was last built.
    execFileSync("pnpm", ["--filter", "tracker", "build"], {
      cwd: ROOT,
      stdio: "pipe",
    });

    admin = new Client({ connectionString: SERVER_URL });
    await admin.connect();
    // template0 rather than the developer's own database: this is a fresh
    // schema built by the real migrations, not a copy of anyone's data.
    await admin.query(`CREATE DATABASE "${SCRATCH}" TEMPLATE template0`);

    // Read once at import by db.server, so it has to be in place before the
    // first of these dynamic imports and not one line later.
    process.env.DATABASE_URL = scratchUrl();

    database = await import("~/shared/lib/db.server");
    users = await import("~/modules/auth/queries.server");
    sites = await import("~/modules/websites/queries.server");
    metrics = await import("~/modules/analytics/metrics.server");
    collect = await import("../collect");
    duration = await import("../collect.duration");

    await migrate(database.db, { migrationsFolder: MIGRATIONS });

    user = await users.createUser({
      firstname: "E2E",
      lastname: "Runner",
      email: "e2e@aurora.test",
      password: "not-a-real-password",
    });
  }, 120_000);

  afterAll(async () => {
    try {
      await database?.db.$client.end();
    } finally {
      if (admin) {
        await drop();
        await admin.end();
      }
    }
  }, 30_000);

  /**
   * The scratch database goes away, and quietly.
   *
   * `pool.end()` resolves once it has asked every pooled client to close, not
   * once their sockets have — so `DROP DATABASE ... WITH (FORCE)` can arrive
   * while one is still shutting down, terminate it, and make db.server's idle
   * client handler print a hundred-line pg error over whatever the run was
   * actually reporting. A plain DROP refuses instead of terminating, so
   * retrying it waits the stragglers out; FORCE is kept as the last resort,
   * because leaving the database behind is worse than the noise.
   */
  async function drop() {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        await admin.query(`DROP DATABASE IF EXISTS "${SCRATCH}"`);

        return;
      } catch {
        await new Promise((done) => {
          setTimeout(done, 100);
        });
      }
    }

    await admin.query(`DROP DATABASE IF EXISTS "${SCRATCH}" WITH (FORCE)`);
  }

  /** One website per journey, so no journey can read another's rows. */
  async function site(name: string) {
    const website = await sites.createWebsite({
      name,
      url: SITE_URL,
      is_public: false,
      user_id: user.id,
    });

    return website.id;
  }

  /*
   * The document.
   */

  const PUSH = history.pushState;
  const REPLACE = history.replaceState;
  const SCREEN = Object.getOwnPropertyDescriptor(window, "screen");

  let beacons: Beacon[] = [];
  let listeners: Array<[EventTarget, string, any, any]> = [];
  let clock = 0;

  /**
   * The bundle registers listeners on globals this file shares and nothing can
   * unregister an anonymous listener it did not capture, so every registration
   * is recorded on the way in and undone when the document goes away.
   */
  const record = (target: EventTarget) => {
    const original = target.addEventListener.bind(target) as any;

    vi.spyOn(target as any, "addEventListener").mockImplementation(
      (...args: any[]) => {
        listeners.push([target, args[0], args[1], args[2]]);
        original(...args);
      }
    );
  };

  /** Moves the url the way a browser does: without announcing it. */
  const at = (url: string) => REPLACE.call(history, null, "", url);

  /** The visitor closes the tab. Everything the bundle installed comes off. */
  function land() {
    for (const [target, type, listener, options] of listeners) {
      target.removeEventListener(type, listener, options);
    }

    listeners = [];
    history.pushState = PUSH;
    history.replaceState = REPLACE;

    if (SCREEN) {
      Object.defineProperty(window, "screen", SCREEN);
    }

    delete (window as any).aurora;
    delete (document as any).referrer;
    document.head.innerHTML = "";
    at("/");

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }

  /**
   * A document opens with the shipped bundle on it.
   *
   * `new Function` and not an import: this is the minified IIFE esbuild wrote,
   * which is what a customer's browser downloads, and evaluating it here runs
   * it against exactly the globals a page gives it. `document.currentScript` is
   * null under that, which is the same answer a browser gives for a bundle a
   * tag manager injected — the tracker's documented fallback then finds the
   * `<script aurora-id>` tag by query, as it does on those pages.
   */
  async function boot(
    wid: string,
    url: string,
    options: { referrer?: string } = {}
  ) {
    land();

    beacons = [];
    clock = 0;

    at(url);
    record(window);
    record(document);

    if (options.referrer) {
      Object.defineProperty(document, "referrer", {
        value: options.referrer,
        configurable: true,
      });
    }

    // jsdom reports a zero-width screen, which the tracker rightly omits.
    Object.defineProperty(window, "screen", {
      value: { width: 1920 },
      configurable: true,
    });

    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.stubGlobal("navigator", {
      language: "en-US",
      doNotTrack: null,
      sendBeacon: (endpoint: string, body: string) => {
        beacons.push({ url: endpoint, body: JSON.parse(body) });

        return true;
      },
    });

    const script = document.createElement("script");

    script.setAttribute("aurora-id", wid);
    script.setAttribute("src", SRC);
    document.head.append(script);

    // oxlint-disable-next-line no-new-func
    new Function(readFileSync(BUNDLE, "utf8"))();

    await tick();
  }

  /*
   * The wire.
   */

  /**
   * Every captured beacon, posted at the real route in the order the browser
   * queued it — sequentially, because sessionization reads the row the previous
   * beacon wrote.
   *
   * The headers are the ones a browser really sends: `text/plain` because
   * `sendBeacon` labels a string body that way and declaring JSON would cost a
   * preflight, an Origin the site owns, and a forwarded address, which is the
   * only input `visitorId` has that distinguishes one reader from another.
   *
   * Answers come back as the status, or as `<status>: <message>` when the route
   * refused — so a 422 the beacon should never have earned names itself in the
   * assertion instead of surfacing three lines later as a missing row.
   */
  async function deliver(sent: Beacon[], visitor: Visitor) {
    const replies: Array<number | string> = [];

    for (const beacon of sent) {
      const timed = beacon.url === DURATION;

      const request = new Request(
        timed
          ? "https://collect.aurora.test/collect/duration"
          : "https://collect.aurora.test/collect",
        {
          method: "POST",
          headers: {
            "content-type": "text/plain;charset=UTF-8",
            "user-agent": visitor.ua ?? CHROME,
            origin: SITE_URL,
            "x-forwarded-for": visitor.ip,
            ...(visitor.country ? { "cf-ipcountry": visitor.country } : {}),
          },
          body: JSON.stringify(beacon.body),
        }
      );

      // Branched rather than picked into one variable: the two actions take
      // their own route's args type and a union of them infers as neither.
      const response = timed
        ? await run<DurationArgs>(duration.action, request)
        : await run<CollectArgs>(collect.action, request);

      if (response.status === 204) {
        replies.push(response.status);
        continue;
      }

      const refusal = (await response.json()) as { message?: string };

      replies.push(`${response.status}: ${refusal.message}`);
    }

    return replies;
  }

  /*
   * The database, read back as rows and as the figures a dashboard renders.
   */

  const recorded = (wid: string) =>
    database.db
      .select()
      .from(events)
      .where(eq(events.website_id, wid))
      .orderBy(asc(events.created_at));

  const panels = (wid: string) => metrics.breakdowns(wid, WINDOW);
  const stats = (wid: string) => metrics.statistics(wid, WINDOW);
  const goals = (wid: string) => metrics.customEvents(wid, WINDOW);
  const series = (wid: string) =>
    metrics.timeseries(wid, { ...WINDOW, unit: "day", tz: "UTC" });

  beforeEach(() => {
    limiter.reset();
  });

  afterEach(() => {
    land();
  });

  it("applies the real migrations to the scratch database", async () => {
    const { rows } = await database.db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by 1
    `);

    // The drizzle bookkeeping table lives in its own schema, so this is the
    // whole of what 0000 and 0001 leave behind — including the two tables 0001
    // drops, whose absence is the evidence it ran rather than being skipped.
    expect(rows.map((row) => row.table_name)).toEqual([
      "events",
      "users",
      "websites",
    ]);
  });

  it("records a search arrival as one bounced session", async () => {
    const wid = await site("search arrival");

    await boot(wid, "/", {
      referrer: "https://www.google.com/search?q=aurora+analytics",
    });

    // The tracker sends the origin and never the path: the search phrase is
    // the reader's, and only the host was ever going to be stored.
    expect(beacons).toEqual([
      {
        url: COLLECT,
        body: {
          wid,
          type: "pageview",
          vid: expect.any(String),
          path: "/",
          referrer: "https://www.google.com",
          language: "en-US",
          screen: 1920,
        },
      },
    ]);

    expect(
      await deliver(beacons, { ip: "203.0.113.10", country: "IT" })
    ).toEqual([204]);

    const rows = await recorded(wid);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "pageview",
      path: "/",
      view_token: beacons[0].body.vid,
      referrer_host: "google.com",
      channel: "search",
      is_new_visitor: true,
      is_new_session: true,
      is_a_bounce: true,
      browser: "Chrome",
      os: "macOS",
      device: "desktop",
      screen_class: "desktop",
      country: "IT",
      locale: "en-US",
      duration: null,
    });

    const figures = await stats(wid);

    expect(figures).toEqual({
      visits: 1,
      uniqueVisits: 1,
      sessions: 1,
      // Null and not zero: no duration beacon was sent, which is a different
      // fact from a visit that lasted no time.
      avgDuration: null,
      bounces: 1,
    });
    expect(figures.bounces / figures.sessions).toBe(1);

    const breakdowns = await panels(wid);

    expect(breakdowns.referrers).toEqual({
      unit: "sessions",
      rows: [{ element: "google.com", count: 1, unique: 1 }],
    });
    expect(breakdowns.channels.rows).toEqual([
      { element: "search", count: 1, unique: 1 },
    ]);
    expect(breakdowns.pages.rows).toEqual([
      { element: "/", count: 1, unique: 1 },
    ]);
    expect(breakdowns.countries.rows).toEqual([
      { element: "IT", count: 1, unique: 1 },
    ]);

    expect(views(await series(wid))).toBe(1);
  });

  it("clears the first page's bounce when an SPA visit reaches a second", async () => {
    const wid = await site("spa visit");
    const visitor = { ip: "203.0.113.20" };

    await boot(wid, "/");

    history.pushState(null, "", "/pricing");
    await tick();

    history.pushState(null, "", "/docs");
    await tick();

    expect(beacons.map((beacon) => beacon.body.path)).toEqual([
      "/",
      "/pricing",
      "/docs",
    ]);
    // Three views, three tokens: each is a row a duration beacon can name.
    expect(new Set(beacons.map((beacon) => beacon.body.vid)).size).toBe(3);

    // The arrival on its own first, because "cleared retroactively" is a claim
    // about a row that was already written and is only true if the flag was
    // set when it went in.
    expect(await deliver(beacons.slice(0, 1), visitor)).toEqual([204]);
    expect((await recorded(wid))[0]).toMatchObject({
      path: "/",
      is_a_bounce: true,
    });
    expect(await stats(wid)).toMatchObject({ visits: 1, bounces: 1 });

    expect(await deliver(beacons.slice(1), visitor)).toEqual([204, 204]);

    const rows = await recorded(wid);

    expect(rows.map((row) => row.path)).toEqual(["/", "/pricing", "/docs"]);
    // The row the first beacon wrote, reached back into and cleared.
    expect(rows[0]).toMatchObject({ is_a_bounce: false, is_new_session: true });
    expect(rows.every((row) => !row.is_a_bounce)).toBe(true);
    expect(new Set(rows.map((row) => row.session_id)).size).toBe(1);
    // Pages 2 and 3 open nothing: the acquisition panels count arrivals, and
    // this visit arrived once.
    expect(rows.filter((row) => row.is_new_session)).toHaveLength(1);

    expect(await stats(wid)).toEqual({
      visits: 3,
      uniqueVisits: 1,
      sessions: 1,
      avgDuration: null,
      bounces: 0,
    });

    const breakdowns = await panels(wid);

    expect(breakdowns.pages.rows).toEqual([
      { element: "/", count: 1, unique: 1 },
      { element: "/docs", count: 1, unique: 1 },
      { element: "/pricing", count: 1, unique: 1 },
    ]);

    expect(views(await series(wid))).toBe(3);
  });

  it("averages visit duration over sessions rather than over pageviews", async () => {
    const wid = await site("timed visit");

    await boot(wid, "/guide");

    clock = 7_000;
    history.pushState(null, "", "/guide/step-2");
    await tick();

    clock = 10_000;
    window.dispatchEvent(new Event("pagehide"));

    // The leaving page's time is flushed against the leaving page's token,
    // before the next view mints its own.
    expect(
      beacons.map((beacon) => [beacon.url === DURATION, beacon.body.duration])
    ).toEqual([
      [false, undefined],
      [true, 7_000],
      [false, undefined],
      [true, 3_000],
    ]);

    expect(await deliver(beacons, { ip: "203.0.113.30" })).toEqual([
      204, 204, 204, 204,
    ]);

    const rows = await recorded(wid);

    expect(rows.map((row) => [row.path, row.duration])).toEqual([
      ["/guide", 7_000],
      ["/guide/step-2", 3_000],
    ]);
    expect(new Set(rows.map((row) => row.session_id)).size).toBe(1);

    // 10s on the site, not a 5s average of two pages. One visit is one visit
    // however many pages it spans, and the per-event reading is exactly the
    // defect the two-level aggregate in getWebsiteStatistics exists to avoid.
    expect(await stats(wid)).toEqual({
      visits: 2,
      uniqueVisits: 1,
      sessions: 1,
      avgDuration: 10_000,
      bounces: 0,
    });
  });

  it("attributes a utm arrival to Campaigns and leaves the rest out of it", async () => {
    const wid = await site("campaign arrival");

    await boot(
      wid,
      "/?utm_source=newsletter&utm_medium=email&utm_campaign=spring-sale&utm_term=analytics&utm_content=header"
    );

    // The query never becomes part of the path — one page, not one row per
    // campaign — and the five values ride in their own field.
    expect(beacons[0].body).toMatchObject({
      path: "/",
      utm: {
        source: "newsletter",
        medium: "email",
        campaign: "spring-sale",
        term: "analytics",
        content: "header",
      },
    });

    expect(await deliver(beacons, { ip: "203.0.113.40" })).toEqual([204]);

    // A second visit to the same site carrying no campaign at all, which is
    // what the Campaigns panel has to leave out rather than bucket.
    await boot(wid, "/");
    expect(await deliver(beacons, { ip: "203.0.113.41" })).toEqual([204]);

    const [arrival, plain] = await recorded(wid);

    expect(arrival).toMatchObject({
      channel: "campaign",
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: "spring-sale",
      utm_term: "analytics",
      utm_content: "header",
      is_new_session: true,
    });
    expect(plain).toMatchObject({
      channel: "direct",
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    });

    const breakdowns = await panels(wid);

    expect(breakdowns.channels.rows).toEqual([
      { element: "campaign", count: 1, unique: 1 },
      { element: "direct", count: 1, unique: 1 },
    ]);
    // Exactly one row each, and no empty bucket: a session that arrived
    // without campaign parameters is not an unattributed campaign, it is not a
    // row — otherwise the site's whole audience sits in a card headed
    // "Campaigns" and every real campaign is drawn relative to it.
    expect(breakdowns.utmSources).toEqual({
      unit: "sessions",
      rows: [{ element: "newsletter", count: 1, unique: 1 }],
    });
    expect(breakdowns.utmMediums.rows).toEqual([
      { element: "email", count: 1, unique: 1 },
    ]);
    expect(breakdowns.utmCampaigns.rows).toEqual([
      { element: "spring-sale", count: 1, unique: 1 },
    ]);
    expect(breakdowns.utmTerms.rows).toEqual([
      { element: "analytics", count: 1, unique: 1 },
    ]);
    expect(breakdowns.utmContents.rows).toEqual([
      { element: "header", count: 1, unique: 1 },
    ]);

    expect(await stats(wid)).toMatchObject({
      visits: 2,
      uniqueVisits: 2,
      sessions: 2,
    });
  });

  it("counts a revenue event as a goal and not as traffic", async () => {
    const wid = await site("goal with revenue");

    await boot(wid, "/checkout");

    fire("purchase", {
      props: { plan: "pro", seats: 4, trial: false },
      revenue: { amount: 49, currency: "eur" },
    });
    fire("purchase", { revenue: { amount: 10.5, currency: "usd" } });
    fire("signup");

    expect(await deliver(beacons, { ip: "203.0.113.50" })).toEqual([
      204, 204, 204, 204,
    ]);

    const rows = await recorded(wid);
    const [view, ...fired] = rows;

    expect(view).toMatchObject({ type: "pageview", is_new_session: true });
    expect(fired.map((row) => [row.name, row.revenue, row.currency])).toEqual([
      ["purchase", 49, "EUR"],
      ["purchase", 10.5, "USD"],
      ["signup", null, null],
    ]);
    // A custom event joins the open session and carries no first-ness of its
    // own: `session_id` is NOT NULL, so it gets one either way, and all three
    // flags false is what keeps it out of every headline figure.
    expect(
      fired.every(
        (row) =>
          row.session_id === view.session_id &&
          row.view_token === null &&
          !row.is_new_visitor &&
          !row.is_new_session &&
          !row.is_a_bounce
      )
    ).toBe(true);
    expect(fired[0].props).toEqual({ plan: "pro", seats: 4, trial: false });

    // One pageview, one session, and a bounce that three `aurora()` calls did
    // not clear — the visit really did stop at one page.
    expect(await stats(wid)).toEqual({
      visits: 1,
      uniqueVisits: 1,
      sessions: 1,
      avgDuration: null,
      bounces: 1,
    });
    expect(views(await series(wid))).toBe(1);
    expect((await panels(wid)).pages.rows).toEqual([
      { element: "/checkout", count: 1, unique: 1 },
    ]);

    // Two currencies, never added together: 49.00 EUR + 10.50 USD is not 59.50
    // of anything.
    expect(await goals(wid)).toEqual([
      {
        name: "purchase",
        count: 2,
        unique: 1,
        revenue: [
          { currency: "EUR", total: 49 },
          { currency: "USD", total: 10.5 },
        ],
      },
      { name: "signup", count: 1, unique: 1, revenue: [] },
    ]);
  });

  it("counts two readers of one site as two daily visitors", async () => {
    const wid = await site("two visitors");

    await boot(wid, "/");
    expect(await deliver(beacons, { ip: "203.0.113.60" })).toEqual([204]);

    await boot(wid, "/");
    expect(await deliver(beacons, { ip: "203.0.113.61" })).toEqual([204]);

    const rows = await recorded(wid);

    expect(new Set(rows.map((row) => row.visitor_id)).size).toBe(2);
    expect(rows.every((row) => row.is_new_visitor)).toBe(true);

    expect(await stats(wid)).toEqual({
      visits: 2,
      uniqueVisits: 2,
      sessions: 2,
      avgDuration: null,
      bounces: 2,
    });
    // The panel counts views and the second column counts readers, so one page
    // read once by each of them is 2 and 2 — not one row per visitor.
    expect((await panels(wid)).pages.rows).toEqual([
      { element: "/", count: 2, unique: 2 },
    ]);
  });

  it("opens a second session for a reader who comes back after the window", async () => {
    const wid = await site("returning visitor");
    const visitor = { ip: "203.0.113.70" };

    await boot(wid, "/");
    expect(await deliver(beacons, visitor)).toEqual([204]);

    // The visit ages past SESSION_WINDOW_MS. Moving the row rather than the
    // process clock keeps `visitorId` on the real UTC date, which is what makes
    // the two visits one visitor — advancing a fake clock by 31 minutes could
    // step over midnight and rotate the pseudonym, which is the one thing this
    // journey needs held still.
    await database.db.execute(sql`
      update ${events}
      set created_at = created_at - interval '31 minutes'
      where ${eq(events.website_id, wid)}
    `);

    await boot(wid, "/blog");
    expect(await deliver(beacons, visitor)).toEqual([204]);

    const rows = await recorded(wid);

    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.visitor_id)).size).toBe(1);
    expect(new Set(rows.map((row) => row.session_id)).size).toBe(2);
    expect(rows.map((row) => row.is_new_session)).toEqual([true, true]);
    // A returning reader is not a new visitor: the flag is about the first
    // pageview this pseudonym ever sent, and today it already had one.
    expect(rows.map((row) => row.is_new_visitor)).toEqual([true, false]);

    expect(await stats(wid)).toEqual({
      visits: 2,
      // Visitor-days, and both visits are the same day and the same reader.
      uniqueVisits: 1,
      sessions: 2,
      avgDuration: null,
      bounces: 2,
    });
  });

  it("answers a crawler 204 and writes nothing", async () => {
    const wid = await site("crawler");

    await boot(wid, "/");

    // The same beacon a browser would have sent, delivered by something that
    // is not a reader. 204 rather than a refusal: a crawler is told nothing.
    expect(
      await deliver(beacons, { ip: "66.249.66.1", ua: GOOGLEBOT })
    ).toEqual([204]);

    expect(await recorded(wid)).toEqual([]);
    expect(await stats(wid)).toEqual({
      visits: 0,
      uniqueVisits: 0,
      sessions: 0,
      avgDuration: null,
      bounces: 0,
    });
    expect((await panels(wid)).pages.rows).toEqual([]);
    expect(views(await series(wid))).toBe(0);
  });
});
