/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://example.com/" }
 *
 * The rest of this suite is server code and does not care, but the last block
 * boots the real tracker bundle against the real schemas in this file, and the
 * tracker reads the DOM as it is imported. Node's own `Request`, `Response`,
 * `Headers` and `Buffer` all survive the swap — jsdom defines none of them — so
 * the route tests below run exactly as they did.
 */
import { limiter, rateLimit } from "~/lib/ratelimit.server";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePath } from "../../../../../packages/tracker/src/payload";

/**
 * The routes reach the database through `db` and `getWebsite` only, so the
 * whole data layer is one fake: a chainable builder that records what each
 * statement was asked to write and hands back whatever the test staged.
 *
 * Every chain records its arguments, including the SELECT's. The `where`
 * clauses are kept as the drizzle SQL objects they are and serialised on
 * demand — the predicates on the sessionization lookup, the bounce clear and
 * the duration match are all load-bearing for index usage and for correctness,
 * and asserting on them is the only way a test can see them at all. A stub that
 * threw its arguments away could not tell `ORDER BY created_at DESC` from `ASC`,
 * which is the difference between a session and a lifetime.
 */
const stub = vi.hoisted(() => {
  const state = {
    previous: null as { session_id: string; created_at: Date } | null,
    /** The opening pageview of the session a restart carries forward from. */
    opener: null as Record<string, unknown> | null,
    website: null as { id: string; url: string } | null,
    insertError: null as unknown,
    inserted: [] as Record<string, unknown>[],
    updates: [] as { values: Record<string, unknown>; where: unknown }[],
    selects: [] as {
      where: unknown;
      orderBy: unknown[];
      limit: number | null;
    }[],
    executed: [] as unknown[],
    lookups: 0,
  };

  const query = {
    execute: (statement: unknown) => {
      state.executed.push(statement);

      return Promise.resolve([]);
    },
    select: () => ({
      from: () => ({
        where: (where: unknown) => {
          const record = { where, orderBy: [] as unknown[], limit: null };

          state.selects.push(record);

          // A request's first select is the sessionization lookup; a second one
          // is the restart reading the acquisition it carries forward, and the
          // two are staged apart so a test can tell which row answered.
          const rows = () =>
            state.selects.length > 1
              ? state.opener && [state.opener]
              : state.previous && [state.previous];

          const limit = (rowCount: number) => {
            Object.assign(record, { limit: rowCount });

            return Promise.resolve(rows() ?? []);
          };

          return {
            limit,
            orderBy: (...orderBy: unknown[]) => {
              record.orderBy = orderBy;

              return { limit };
            },
          };
        },
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: (where: unknown) => {
          state.updates.push({ values, where });

          return state.insertError
            ? Promise.reject(state.insertError)
            : Promise.resolve([]);
        },
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        state.inserted.push(values);

        return state.insertError
          ? Promise.reject(state.insertError)
          : Promise.resolve([]);
      },
    }),
  };

  return {
    state,
    db: {
      ...query,
      transaction: (run: (tx: typeof query) => Promise<unknown>) => run(query),
    },
    getWebsite: () => {
      state.lookups += 1;

      return Promise.resolve(state.website);
    },
  };
});

vi.mock("~/lib/queries.server", () => ({
  db: stub.db,
  getWebsite: stub.getWebsite,
}));

const {
  action: collectAction,
  loader: collectLoader,
  collectSchema,
} = await import("../collect");
const {
  action: durationAction,
  loader: durationLoader,
  durationSchema,
} = await import("../collect.duration");

type CollectArgs = Parameters<typeof collectAction>[0];
type DurationArgs = Parameters<typeof durationAction>[0];

const dialect = new PgDialect({ casing: "snake_case" });
const compile = (where: unknown) => dialect.sqlToQuery(where as SQL);

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

const SITE = { id: "site-id", url: "https://example.com" };

const pageview = {
  wid: "site-wid",
  type: "pageview",
  vid: "0193b4a2-view-token",
  path: "/pricing",
  referrer: "https://news.ycombinator.com/item?id=1",
  language: "en-US",
  screen: 1920,
  viewport: 1440,
};

const NUL = String.fromCharCode(0);
const LONE_HIGH = String.fromCharCode(0xd800);
const LONE_LOW = String.fromCharCode(0xdfff);
const REPLACEMENT = String.fromCharCode(0xfffd);

const request = (
  body: BodyInit,
  headers: Record<string, string> = {},
  method = "POST",
  path = "/collect"
) =>
  new Request(`https://aurora.test${path}`, {
    method,
    headers: {
      "content-type": "text/plain",
      "user-agent": CHROME,
      ...headers,
    },
    ...(method === "POST" ? { body } : {}),
  });

const build = (body: unknown, headers: Record<string, string> = {}) =>
  request(JSON.stringify(body), headers);

const run = <T>(handler: (args: T) => unknown, req: Request) =>
  handler({ request: req, params: {}, context: {} } as T) as Promise<Response>;

const collect = (body: unknown, headers?: Record<string, string>) =>
  run<CollectArgs>(collectAction, build(body, headers));

const duration = (body: unknown, headers?: Record<string, string>) =>
  run<DurationArgs>(durationAction, build(body, headers));

const last = () => stub.state.inserted.at(-1) ?? {};

const tick = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

/** An `aurora()` call, made the way a customer's page makes one. */
const fire = (name: string, options: unknown) => {
  (window as unknown as { aurora: (n: string, o: unknown) => void }).aurora(
    name,
    options
  );
};

beforeEach(() => {
  limiter.reset();
  stub.state.previous = null;
  stub.state.opener = null;
  stub.state.website = SITE;
  stub.state.insertError = null;
  stub.state.inserted = [];
  stub.state.updates = [];
  stub.state.selects = [];
  stub.state.executed = [];
  stub.state.lookups = 0;
});

describe("collectSchema", () => {
  it("accepts what the tracker sends", () => {
    expect(collectSchema.safeParse(pageview).success).toBe(true);
    expect(
      collectSchema.safeParse({ ...pageview, corrects: true }).success
    ).toBe(true);
    expect(
      collectSchema.safeParse({ ...pageview, corrects: "yes" }).success
    ).toBe(false);
  });

  it("rejects the old camelCase type outright", () => {
    // The check constraint rejects it too; failing here is the cheaper half.
    expect(
      collectSchema.safeParse({ ...pageview, type: "pageView" }).success
    ).toBe(false);
  });

  it("requires wid, vid and a path", () => {
    for (const field of ["wid", "vid", "path"]) {
      expect(
        collectSchema.safeParse({ ...pageview, [field]: "" }).success
      ).toBe(false);
    }
  });

  it("names a custom event or refuses it", () => {
    const event = { ...pageview, type: "event" };

    expect(collectSchema.safeParse(event).success).toBe(false);
    expect(collectSchema.safeParse({ ...event, name: "signup" }).success).toBe(
      true
    );
  });

  it("strips query and hash and forces a leading slash", () => {
    const parsed = collectSchema.parse({
      ...pageview,
      path: "docs/intro?utm_source=x#top",
    });

    expect(parsed.path).toBe("/docs/intro");
  });

  /**
   * A hash-routed app — Vue Router's hash mode, Angular's
   * HashLocationStrategy, `createHashRouter`, anything on a static host that
   * cannot serve a rewrite — put its whole address in the fragment, so
   * collapsing it gave those sites one row, always `/`, one pageview per
   * document, and a bounce on every visit because the second pageview that
   * clears it never existed.
   */
  it("keeps a route-shaped fragment, which is a whole page", () => {
    const path = (value: string) =>
      collectSchema.parse({ ...pageview, path: value }).path;

    expect(path("/#/settings")).toBe("/#/settings");
    expect(path("/app#/orders/42")).toBe("/app#/orders/42");
    expect(path("#/dashboard")).toBe("/#/dashboard");
    // The document's query still goes, and so does the route's own: a hash
    // router puts its search params after the route.
    expect(path("/?tab=1#/orders?page=2")).toBe("/#/orders");
  });

  /**
   * Nothing looser than `#/`, and this is why: a fragment is where the web puts
   * secrets. `path` is unbounded text rendered in a dashboard panel.
   */
  it("still strips an anchor, and anything carrying a token", () => {
    const path = (value: string) =>
      collectSchema.parse({ ...pageview, path: value }).path;

    expect(path("/pricing#plans")).toBe("/pricing");
    expect(path("/post#comment-1234")).toBe("/post");
    expect(path("/callback#access_token=ya29.a0AeXRPp&token_type=Bearer")).toBe(
      "/callback"
    );
    expect(path("/auth#id_token=eyJhbGciOiJSUzI1NiJ9")).toBe("/auth");
    expect(path("/x#")).toBe("/x");
    // And the two shapes that get past the `#/` test: a redirect URI which
    // already carries a fragment is undefined in RFC 6749, so a provider
    // appends to the fragment that is there rather than replacing it.
    expect(path("/#/callback&access_token=ya29.a0AeXRPp")).toBe("/#/callback");
    expect(path("/#/callback#access_token=ya29.a0AeXRPp")).toBe("/#/callback");
  });

  it("bounds a route-shaped path by bytes like any other", () => {
    // The bound runs on the value as it arrived and the transform only ever
    // removes from it, so the fragment cannot buy a caller more room.
    expect(
      collectSchema.safeParse({
        ...pageview,
        path: `/#/${"é".repeat(600)}`,
      }).success
    ).toBe(false);
    expect(
      collectSchema.safeParse({ ...pageview, path: `/#/${"a".repeat(1_000)}` })
        .success
    ).toBe(true);
  });

  it("takes a platform version the headers cannot deliver", () => {
    expect(
      collectSchema.parse({ ...pageview, platformVersion: "15.0.0" })
        .platformVersion
    ).toBe("15.0.0");
    // Optional and additive: a tracker that predates it, or a browser with no
    // `userAgentData`, sends no key at all.
    expect(collectSchema.parse(pageview)).not.toHaveProperty("platformVersion");
    expect(
      collectSchema.safeParse({ ...pageview, platformVersion: 15 }).success
    ).toBe(false);
    // Attacker-controlled like every other body string, so bounded like one.
    expect(
      collectSchema.safeParse({
        ...pageview,
        platformVersion: "9".repeat(33),
      }).success
    ).toBe(false);
    expect(
      collectSchema.safeParse({
        ...pageview,
        platformVersion: "é".repeat(17),
      }).success
    ).toBe(false);
  });

  it("bounds a path by bytes rather than characters", () => {
    expect(
      collectSchema.safeParse({ ...pageview, path: `/${"é".repeat(600)}` })
        .success
    ).toBe(false);
  });

  it("bounds a name and a referrer by bytes too", () => {
    // 300 two-byte characters is 600 bytes but only 300 `.max()` units, which
    // is the whole reason `bounded` exists.
    expect(
      collectSchema.safeParse({
        ...pageview,
        type: "event",
        name: "é".repeat(101),
      }).success
    ).toBe(false);
    expect(
      collectSchema.safeParse({
        ...pageview,
        type: "event",
        name: "é".repeat(100),
      }).success
    ).toBe(true);
    expect(
      collectSchema.safeParse({
        ...pageview,
        referrer: `https://x.test/${"é".repeat(600)}`,
      }).success
    ).toBe(false);
  });

  it("blanks utm parameters that were not in the URL", () => {
    const parsed = collectSchema.parse({
      ...pageview,
      utm: { source: "newsletter", medium: "  ", campaign: "" },
    });

    expect(parsed.utm).toEqual({
      source: "newsletter",
      medium: null,
      campaign: null,
      term: null,
      content: null,
    });
  });

  it("bounds props on every axis", () => {
    const props = (value: Record<string, unknown>) =>
      collectSchema.safeParse({ ...pageview, props: value }).success;

    expect(props({ plan: "pro", seats: 4, trial: false })).toBe(true);
    expect(props({ nested: { a: 1 } })).toBe(false);
    expect(props({ [`k${"e".repeat(64)}`]: 1 })).toBe(false);
    expect(props({ note: "n".repeat(513) })).toBe(false);
    // Multibyte, because ASCII cannot tell a byte bound from a `.max()` one:
    // 33 two-byte characters is 66 bytes and 33 code units.
    expect(props({ ["é".repeat(33)]: 1 })).toBe(false);
    expect(props({ ["é".repeat(32)]: 1 })).toBe(true);
    expect(props({ note: "é".repeat(257) })).toBe(false);
    expect(
      props(Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i, i])))
    ).toBe(false);
    expect(
      props(Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i, i])))
    ).toBe(true);
  });

  it("bounds the website id a caller may name", () => {
    expect(
      collectSchema.safeParse({ ...pageview, wid: "w".repeat(33) }).success
    ).toBe(false);
    expect(
      collectSchema.safeParse({ ...pageview, wid: "w".repeat(32) }).success
    ).toBe(true);
  });

  it("rejects revenue the numeric(14, 2) column cannot hold", () => {
    const amount = (value: unknown) =>
      collectSchema.safeParse({
        ...pageview,
        type: "event",
        name: "purchase",
        revenue: { amount: value, currency: "eur" },
      }).success;

    expect(amount(999_999_999_999.99)).toBe(true);
    expect(amount(-999_999_999_999.99)).toBe(true);
    // An overflow arrives as a 22003 that aborts the ingest transaction, so
    // this is an availability bound and not a tidiness one.
    expect(amount(1_000_000_000_000)).toBe(false);
    expect(amount(-1_000_000_000_000)).toBe(false);
    expect(amount(Number.POSITIVE_INFINITY)).toBe(false);
    expect(amount(Number.NaN)).toBe(false);
    expect(amount("49")).toBe(false);
  });

  it("takes exactly three letters of currency", () => {
    const currency = (value: string) =>
      collectSchema.safeParse({
        ...pageview,
        type: "event",
        name: "purchase",
        revenue: { amount: 1, currency: value },
      });

    expect(currency("eur").success).toBe(true);
    expect(currency("eu").success).toBe(false);
    expect(currency("euro").success).toBe(false);
    expect(currency("e1r").success).toBe(false);
  });

  /**
   * Postgres refuses U+0000 in `text` (22021) and in `jsonb` (22P05), and
   * refuses an unpaired surrogate in `jsonb` (22P02). None of those is 23505,
   * so before the repair every one of them threw straight out of the action.
   */
  it("repairs the two characters Postgres cannot store", () => {
    const parsed = collectSchema.parse({
      ...pageview,
      type: "event",
      name: `sign${NUL}up`,
      vid: `tok${NUL}en`,
      path: `/a${NUL}b`,
      referrer: `https://x.test/${NUL}`,
      utm: { source: `goo${NUL}gle` },
      props: { [`a${LONE_HIGH}b`]: `x${NUL}y`, other: `z${LONE_LOW}` },
    });

    expect(parsed.name).toBe("signup");
    expect(parsed.vid).toBe("token");
    expect(parsed.path).toBe("/ab");
    expect(parsed.referrer).toBe("https://x.test/");
    expect(parsed.utm?.source).toBe("google");
    expect(parsed.props).toEqual({
      [`a${REPLACEMENT}b`]: "xy",
      other: `z${REPLACEMENT}`,
    });
  });

  it("leaves a well-formed surrogate pair alone", () => {
    expect(collectSchema.parse({ ...pageview, path: "/emoji-😀" }).path).toBe(
      "/emoji-😀"
    );
  });

  it("refuses a field that was only the character it strips", () => {
    expect(collectSchema.safeParse({ ...pageview, vid: NUL }).success).toBe(
      false
    );
    expect(
      collectSchema.safeParse({ ...pageview, type: "event", name: NUL }).success
    ).toBe(false);
  });
});

describe("POST /collect", () => {
  it("answers 204 with an empty body and the caller's own origin", async () => {
    const response = await collect(pageview, { origin: "https://example.com" });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://example.com"
    );
    expect(response.headers.get("vary")).toBe("Origin");
    // Asserted whole: every entry starts with "Sec-CH-UA", so `toContain` was
    // satisfied by any prefix of the list, and dropping
    // Sec-CH-UA-Platform-Version silently empties the os_version column.
    expect(response.headers.get("accept-ch")).toBe(
      "Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Mobile, Sec-CH-UA-Model"
    );
  });

  it("writes a lowercase pageview with everything derived server-side", async () => {
    await collect(
      {
        ...pageview,
        utm: {
          source: "newsletter",
          medium: "email",
          campaign: "launch",
          term: "analytics",
          content: "footer",
        },
      },
      {
        "cf-ipcountry": "de",
        "x-forwarded-for": "70.41.3.18, 203.0.113.7",
      }
    );

    expect(last()).toMatchObject({
      website_id: SITE.id,
      type: "pageview",
      name: null,
      path: "/pricing",
      view_token: pageview.vid,
      is_new_visitor: true,
      is_new_session: true,
      is_a_bounce: true,
      referrer_host: "news.ycombinator.com",
      // The campaign wins over the referrer host, and all five columns are
      // stored beside it: the channel alone reading "campaign" while the utm
      // columns are null is exactly how a breakdown goes quietly empty.
      channel: "campaign",
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: "launch",
      utm_term: "analytics",
      utm_content: "footer",
      browser: "Chrome",
      browser_version: "139",
      device: "desktop",
      screen_class: "desktop",
      country: "DE",
      locale: "en-US",
    });

    expect(last().visitor_id).toHaveLength(22);
    expect(last().session_id).toEqual(expect.any(String));
  });

  it("writes a hash route as the page it is", async () => {
    await collect({ ...pageview, path: "/#/orders?page=2" });

    expect(last().path).toBe("/#/orders");
  });

  /**
   * The column the headers structurally cannot fill. `Accept-CH` is stored only
   * from a top-level navigation response and this origin serves nothing but
   * beacons, so `Sec-CH-UA-Platform-Version` never arrives — and the string it
   * fell back to says `Windows NT 10.0` for both Windows releases.
   */
  it("prefers the payload's platform version over the frozen string", async () => {
    const windows = {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
      "sec-ch-ua": '"Not;A=Brand";v="99", "Google Chrome";v="139"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    };

    await collect(pageview, windows);

    expect(last()).toMatchObject({ os: "Windows", os_version: "10" });

    await collect({ ...pageview, platformVersion: "15.0.0" }, windows);

    // 15 is the release 11 by the table Microsoft publishes, which no user
    // agent string can express.
    expect(last()).toMatchObject({ os: "Windows", os_version: "11" });
  });

  /**
   * The bundle is cached by every browser and every CDN in front of one, so
   * this route always talks to trackers older than itself — for as long as the
   * cache lives, and longer for a self-hosted copy nobody re-deploys.
   * `platformVersion` and `corrects` were both added to the schema additively
   * for that reason, and "additive" is a claim until something posts the shape
   * that predates them.
   */
  it("accepts a beacon from a tracker cached before either field existed", async () => {
    const cached = {
      wid: "site-wid",
      type: "pageview",
      vid: "0193b4a2-cached-token",
      path: "/pricing",
      referrer: "https://news.ycombinator.com/item?id=1",
      language: "en-US",
      screen: 1920,
      // Read and sent by a build that had a use for it, accepted by a schema
      // that has no column for it.
      viewport: 1440,
      // Blank is how a tracker that always sent all five spells "not in the
      // URL". The current one omits the key instead, and both have to mean the
      // same thing or a cached copy rewrites the channel of every visit.
      utm: { source: "", medium: "", campaign: "", term: "", content: "" },
    };

    const response = await collect(cached, { origin: "https://example.com" });

    expect(response.status).toBe(204);
    expect(stub.state.updates).toHaveLength(0);
    expect(last()).toMatchObject({
      type: "pageview",
      path: "/pricing",
      view_token: cached.vid,
      referrer_host: "news.ycombinator.com",
      channel: "social",
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      // No platform version on the wire, so the OS falls back to the headers
      // and then to the string — the frozen `Mac OS X 10_15_7` every Chromium
      // Mac reports, exactly as it did before the field existed.
      os: "macOS",
      os_version: "10",
    });
  });

  it("blanks the utm columns when the URL carried none", async () => {
    await collect(pageview);

    expect(last()).toMatchObject({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      channel: "social",
    });
  });

  it("stores only a locale-codes tag, canonically spelled", async () => {
    await collect({ ...pageview, language: "EN-us" });
    expect(last().locale).toBe("en-US");

    for (const language of ["en-Latn-XYZZY", "not-a-locale", "🙂"]) {
      await collect({ ...pageview, language });
      expect(last().locale).toBeNull();
    }
  });

  it("takes the session lookup off the index it was written for", async () => {
    await collect(pageview);

    const [select] = stub.state.selects;
    const { sql, params } = compile(select.where);

    // The visitor qual, or every visitor on a site joins whoever wrote last.
    expect(sql).toContain('"events"."visitor_id" = $');
    // Pageviews only: a custom event neither opens a session nor extends one.
    expect(sql).toContain('"events"."type" = $');
    expect(params).toEqual([SITE.id, last().visitor_id, "pageview"]);
    // DESC, or `previous` is the visitor's first-ever event and every visit
    // opens a session forever. LIMIT 1, or the one-row backwards walk the
    // (website_id, visitor_id, created_at DESC) index exists for is a scan.
    expect(compile(select.orderBy[0]).sql).toContain("desc");
    expect(select.limit).toBe(1);
  });

  it("serialises the visitor's own transaction before deciding anything", async () => {
    await collect(pageview);

    const [lock] = stub.state.executed;
    const { sql, params } = compile(lock);

    // Two concurrent pageviews from one visitor otherwise both read no
    // previous row at READ COMMITTED and both mint a session.
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(params).toEqual([`${SITE.id}:${last().visitor_id}`]);
    // First statement in the transaction: after the SELECT it locks nothing.
    expect(stub.state.executed).toHaveLength(1);
  });

  it("joins a live session and clears its bounce with both extra quals", async () => {
    stub.state.previous = {
      session_id: "live-session",
      created_at: new Date(Date.now() - 60_000),
    };

    await collect(pageview);

    expect(last()).toMatchObject({
      session_id: "live-session",
      is_new_visitor: false,
      is_new_session: false,
      is_a_bounce: false,
    });

    const [update] = stub.state.updates;
    const { sql, params } = compile(update.where);

    expect(update.values).toEqual({ is_a_bounce: false });
    expect(sql).toContain('"events"."is_a_bounce" = $');
    expect(sql).toContain('"events"."type" = $');
    expect(params).toEqual([SITE.id, "live-session", true, "pageview"]);
  });

  it("opens a new session once the window has passed", async () => {
    stub.state.previous = {
      session_id: "stale-session",
      created_at: new Date(Date.now() - 31 * 60_000),
    };

    await collect(pageview);

    expect(last().session_id).not.toBe("stale-session");
    expect(last()).toMatchObject({
      is_new_visitor: false,
      is_new_session: true,
      is_a_bounce: true,
    });
    expect(stub.state.updates).toHaveLength(0);
  });

  /**
   * The restart is a session, not an arrival. Its pageview carries the site's
   * own previous page as a referrer, which is nulled as a self-referral, so
   * every one of these used to land in Direct — in the panels that count
   * `is_new_session` rows and nothing else.
   */
  describe("a session that restarts mid-visit", () => {
    const ACQUIRED = {
      referrer_host: "google.com",
      channel: "search",
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };

    /** Someone who left a tab open and came back to it through a site link. */
    const resumed = { ...pageview, referrer: "https://example.com/blog" };

    const stale = () => {
      stub.state.previous = {
        session_id: "stale-session",
        created_at: new Date(Date.now() - 31 * 60_000),
      };
    };

    it("carries the acquisition of the visit it continues", async () => {
      stale();
      stub.state.opener = ACQUIRED;

      await collect(resumed);

      // Still a new session, since the half-hour rule is untouched — but no
      // longer a new arrival, which is the whole of the difference.
      expect(last()).toMatchObject({ is_new_session: true, ...ACQUIRED });
    });

    it("carries a campaign as one row rather than a bare channel", async () => {
      stale();
      stub.state.opener = {
        referrer_host: "mail.google.com",
        channel: "campaign",
        utm_source: "newsletter",
        utm_medium: "email",
        utm_campaign: "launch",
        utm_term: null,
        utm_content: null,
      };

      await collect(resumed);

      expect(last()).toMatchObject(stub.state.opener);
    });

    it("reads it off the opening pageview of the session it resumes", async () => {
      stale();
      stub.state.opener = ACQUIRED;

      await collect(resumed);

      const [, carried] = stub.state.selects;
      const { sql, params } = compile(carried.where);

      expect(sql).toContain('"events"."session_id" = $');
      // Every later view of that session was a self-referral too, so its
      // opening pageview is the only row holding an answer to carry.
      expect(sql).toContain('"events"."is_new_session" = $');
      expect(params).toEqual([SITE.id, "stale-session", true, "pageview"]);
      expect(carried.limit).toBe(1);
    });

    it("leaves a restart that genuinely re-arrived alone", async () => {
      stale();
      stub.state.opener = ACQUIRED;

      // The stock pageview arrives from news.ycombinator.com: an external
      // referrer is its own acquisition and may never be overwritten.
      await collect(pageview);

      expect(last()).toMatchObject({
        referrer_host: "news.ycombinator.com",
        channel: "social",
      });
      expect(stub.state.selects).toHaveLength(1);
    });

    it("costs nothing on the path every other pageview takes", async () => {
      stub.state.previous = {
        session_id: "live-session",
        created_at: new Date(Date.now() - 60_000),
      };
      stub.state.opener = ACQUIRED;

      await collect(resumed);

      expect(stub.state.selects).toHaveLength(1);
      expect(last()).toMatchObject({ referrer_host: null, channel: "direct" });
    });

    it("keeps the beacon's own answer when the old session is gone", async () => {
      stale();
      stub.state.opener = null;

      await collect(resumed);

      expect(last()).toMatchObject({ referrer_host: null, channel: "direct" });
    });
  });

  it("lets a custom event join a session without becoming one", async () => {
    stub.state.previous = {
      session_id: "live-session",
      created_at: new Date(Date.now() - 60_000),
    };

    await collect({
      ...pageview,
      type: "event",
      name: "signup",
      props: { plan: "pro" },
      revenue: { amount: 49, currency: "eur" },
    });

    expect(last()).toMatchObject({
      type: "event",
      name: "signup",
      session_id: "live-session",
      // Nothing else may hold a token: the partial unique index is what keeps
      // the duration beacon from ever landing on a custom event.
      view_token: null,
      is_new_visitor: false,
      is_new_session: false,
      is_a_bounce: false,
      props: { plan: "pro" },
      revenue: 49,
      currency: "EUR",
    });

    expect(stub.state.updates).toHaveLength(0);
  });

  it("counts nothing for a custom event that arrives before any pageview", async () => {
    // The case the isPageview guards exist for, and the one the pre-seeded
    // test above cannot reach: an aurora() call from a visitor with no prior
    // row, which happens whenever the pageview beacon was blocked or the
    // integration is event-only. Without the guards it is a unique visitor, a
    // session and a bounce.
    stub.state.previous = null;

    await collect({ ...pageview, type: "event", name: "signup" });

    expect(last()).toMatchObject({
      type: "event",
      is_new_visitor: false,
      is_new_session: false,
      is_a_bounce: false,
      view_token: null,
    });
    expect(stub.state.updates).toHaveLength(0);
  });

  it("drops a self-referral to direct", async () => {
    await collect({ ...pageview, referrer: "https://www.example.com/blog" });

    expect(last()).toMatchObject({ referrer_host: null, channel: "direct" });
  });

  /**
   * The tracker sends one of these when a router replaced the URL while the
   * route it had just announced was still settling — a mount redirect. It is a
   * repair of the row `vid` already names, so the whole ingest path below it
   * has to be skipped: a second insert is what used to clear the session's
   * bounce and double its visit count.
   */
  describe("a correction", () => {
    const correction = {
      wid: pageview.wid,
      type: "pageview",
      vid: pageview.vid,
      path: "/login",
      corrects: true,
    };

    it("moves the row its token names and inserts nothing", async () => {
      const response = await collect(correction, {
        origin: "https://example.com",
      });

      expect(response.status).toBe(204);
      expect(stub.state.inserted).toHaveLength(0);

      const [update] = stub.state.updates;
      const { sql, params } = compile(update.where);

      expect(update.values).toEqual({ path: "/login" });
      // Named for the same reason the duration beacon names it: the unique
      // index over the token is partial on `type = 'pageview'`.
      expect(sql).toContain('"events"."type" = $');
      expect(params).toEqual([SITE.id, pageview.vid, "pageview"]);
    });

    it("decides no session, so it can neither open one nor clear a bounce", async () => {
      stub.state.previous = {
        session_id: "live-session",
        created_at: new Date(Date.now() - 60_000),
      };

      await collect(correction);

      // No advisory lock, no previous-pageview lookup, and the only UPDATE is
      // the path: the arrival this repairs is already counted, once.
      expect(stub.state.executed).toHaveLength(0);
      expect(stub.state.selects).toHaveLength(0);
      expect(stub.state.updates).toHaveLength(1);
      expect(stub.state.updates[0].values).toEqual({ path: "/login" });
    });

    it("normalises the path it writes exactly as an insert would", async () => {
      await collect({ ...correction, path: "login?next=%2Fapp#top" });

      expect(stub.state.updates[0].values).toEqual({ path: "/login" });
    });

    it("stays a 204 when the row it names is not there yet", async () => {
      // Two beacons a few dozen milliseconds apart can arrive out of order, and
      // the token is ephemeral: answering "no such row" would only tell an
      // unauthenticated caller which tokens exist.
      const response = await collect(correction);

      expect(response.status).toBe(204);
    });

    it("answers a failed UPDATE with its own 500", async () => {
      stub.state.insertError = Object.assign(new Error("deadlock"), {
        code: "40P01",
      });

      const error = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const response = await collect(correction, {
          origin: "https://example.com",
        });

        expect(response.status).toBe(500);
        expect(response.headers.get("access-control-allow-origin")).toBe(
          "https://example.com"
        );
      } finally {
        error.mockRestore();
      }
    });

    it("is refused everything a pageview is refused", async () => {
      expect(
        (await collect(correction, { origin: "https://evil.test" })).status
      ).toBe(403);
      expect((await collect({ ...correction, path: "" }, {})).status).toBe(422);

      stub.state.website = null;

      expect((await collect(correction)).status).toBe(404);
      expect(stub.state.updates).toHaveLength(0);
    });

    it("means nothing on a custom event, which still inserts", async () => {
      await collect({
        ...correction,
        type: "event",
        name: "signup",
        corrects: true,
      });

      expect(stub.state.updates).toHaveLength(0);
      expect(last()).toMatchObject({ type: "event", name: "signup" });
    });
  });

  it("answers a crawler 204 and writes nothing", async () => {
    const response = await collect(pageview, {
      "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
    });

    expect(response.status).toBe(204);
    expect(stub.state.lookups).toBe(0);
    expect(stub.state.inserted).toHaveLength(0);
  });

  /**
   * The other half of "prerender/bot => 204, no write". The tracker refuses to
   * send during a prerender, but that is the half that goes stale in a cache;
   * this is the one the server owes regardless of what is running on the page.
   */
  it("answers a prerendering document 204 and writes nothing", async () => {
    const response = await collect(pageview, {
      "sec-purpose": "prefetch;prerender",
    });

    expect(response.status).toBe(204);
    expect(stub.state.lookups).toBe(0);
    expect(stub.state.inserted).toHaveLength(0);
  });

  // A prefetch retrieves a document without running its scripts, so it cannot
  // have produced this beacon and must not be read as having done so.
  it("still records a beacon carrying a plain prefetch purpose", async () => {
    const response = await collect(pageview, { "sec-purpose": "prefetch" });

    expect(response.status).toBe(204);
    expect(stub.state.inserted).toHaveLength(1);
  });

  it("rejects a present but foreign origin", async () => {
    const response = await collect(pageview, { origin: "https://evil.test" });

    expect(response.status).toBe(403);
    expect(stub.state.inserted).toHaveLength(0);
  });

  it("accepts the site's own origin however it is spelled, and no origin", async () => {
    for (const origin of ["https://example.com", "https://www.example.com"]) {
      expect((await collect(pageview, { origin })).status).toBe(204);
    }

    expect((await collect(pageview)).status).toBe(204);
  });

  it("allows localhost outside production only", async () => {
    const local = { origin: "http://localhost:5173" };

    expect((await collect(pageview, local)).status).toBe(204);

    process.env.NODE_ENV = "production";

    try {
      expect((await collect(pageview, local)).status).toBe(403);
    } finally {
      process.env.NODE_ENV = "test";
    }
  });

  it("never echoes the opaque origin back as an allowance", async () => {
    const response = await collect(pageview, { origin: "null" });

    // `Access-Control-Allow-Origin: null` is matched by every sandboxed
    // document there is, so it is withheld rather than echoed — on the 403 as
    // much as anywhere else.
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("vary")).toBe("Origin");
  });

  it("rejects an unparseable body and an unknown website", async () => {
    expect(
      (await run<CollectArgs>(collectAction, request("not json"))).status
    ).toBe(422);

    stub.state.website = null;

    expect((await collect(pageview)).status).toBe(404);
  });

  it("refuses a body no legal payload could fill", async () => {
    // The junk field is stripped by the schema rather than rejected by it, so
    // this payload parses and inserts if the body is read at all: it fails only
    // because the read itself is capped. Unbounded before — `request.text()`
    // buffered whatever arrived, and nothing upstream of the route supplies a
    // limit — which made one POST an arbitrary amount of heap.
    const response = await run<CollectArgs>(
      collectAction,
      request(JSON.stringify({ ...pageview, junk: "W".repeat(40_000) }))
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ message: "Invalid payload" });
    expect(stub.state.lookups).toBe(0);
    expect(stub.state.inserted).toHaveLength(0);
  });

  it("refuses an oversized body on its declared length alone", async () => {
    const response = await run<CollectArgs>(
      collectAction,
      request(JSON.stringify(pageview), { "content-length": "999999" })
    );

    expect(response.status).toBe(422);
    expect(stub.state.inserted).toHaveLength(0);
  });

  it("still accepts a payload that fills every bound it allows", async () => {
    const props = Object.fromEntries(
      Array.from({ length: 24 }, (_, index) => [
        `k${String(index).padStart(2, "0")}${"x".repeat(60)}`,
        "v".repeat(512),
      ])
    );

    const response = await collect({
      ...pageview,
      type: "event",
      name: "n".repeat(200),
      path: `/${"p".repeat(1_023)}`,
      referrer: `https://x.test/${"r".repeat(1_000)}`,
      utm: Object.fromEntries(
        ["source", "medium", "campaign", "term", "content"].map((key) => [
          key,
          "u".repeat(255),
        ])
      ),
      props,
    });

    expect(response.status).toBe(204);
    expect(Object.keys(last().props as object)).toHaveLength(24);
  });

  it("answers a preflight from the loader, which is where OPTIONS lands", async () => {
    // React Router dispatches POST/PUT/PATCH/DELETE to the action and
    // everything else to the loader, so this is the only handler a browser's
    // preflight ever reaches.
    const response = await run<CollectArgs>(
      collectLoader,
      request("", { origin: "https://example.com" }, "OPTIONS")
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://example.com"
    );
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "POST,OPTIONS"
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Content-Type"
    );
    expect(response.headers.get("access-control-max-age")).toBe("86400");
    expect(response.headers.get("vary")).toBe("Origin");
  });

  it("refuses every method that is not POST or OPTIONS", async () => {
    const get = await run<CollectArgs>(collectLoader, request("", {}, "GET"));

    expect(get.status).toBe(405);
    expect(await get.json()).toEqual({ message: "Method not allowed" });

    const put = await run<CollectArgs>(collectAction, request("", {}, "PUT"));

    expect(put.status).toBe(405);
    expect(stub.state.inserted).toHaveLength(0);
  });

  it("refuses past the burst and says when to come back", async () => {
    const headers = { "x-forwarded-for": "198.51.100.4" };

    // Keyed on the caller and nothing out of the payload, so draining it by
    // hand is the same budget the route is about to spend.
    for (let index = 0; index < 240; index += 1) {
      rateLimit("198.51.100.4");
    }

    const response = await collect(pageview, headers);

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(stub.state.lookups).toBe(0);
    expect(stub.state.inserted).toHaveLength(0);
  });

  it("cannot be escaped by rotating the website id", async () => {
    // The whole finding: `wid` came out of the unvalidated body, so one
    // changed character used to mint a brand-new full bucket and the limiter
    // counted requests it could never refuse.
    for (let index = 0; index < 240; index += 1) {
      rateLimit("198.51.100.4");
    }

    const response = await collect(
      { ...pageview, wid: "a-different-wid" },
      { "x-forwarded-for": "198.51.100.4" }
    );

    expect(response.status).toBe(429);
    expect(limiter.size).toBe(1);
    expect(stub.state.lookups).toBe(0);
  });

  it("treats a replayed view token as the success it already was", async () => {
    // What pg raises and drizzle rethrows wrapped in a DrizzleQueryError.
    stub.state.insertError = new Error("insert failed", {
      cause: Object.assign(new Error("duplicate key value"), { code: "23505" }),
    });

    const response = await collect(pageview);

    expect(response.status).toBe(204);
  });

  it("answers anything that is not a duplicate with its own 500", async () => {
    stub.state.insertError = Object.assign(new Error("deadlock"), {
      code: "40P01",
    });

    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await collect(pageview, {
        origin: "https://example.com",
      });

      expect(response.status).toBe(500);
      // Thrown, React Router would answer text/plain with no CORS header at
      // all and, outside a production server mode, with drizzle's whole
      // `Failed query: <sql> params: <values>` in the body.
      expect(await response.json()).toEqual({ message: "Internal error" });
      expect(response.headers.get("access-control-allow-origin")).toBe(
        "https://example.com"
      );
      expect(response.headers.get("vary")).toBe("Origin");
      expect(error).toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});

describe("durationSchema", () => {
  const body = { wid: "site-wid", vid: "0193b4a2-view-token", duration: 4200 };

  it("accepts a beacon payload", () => {
    expect(durationSchema.safeParse(body).success).toBe(true);
  });

  it("refuses anything outside a day, and non-numbers", () => {
    expect(durationSchema.safeParse({ ...body, duration: -1 }).success).toBe(
      false
    );
    expect(
      durationSchema.safeParse({ ...body, duration: 86_400_001 }).success
    ).toBe(false);
    expect(
      durationSchema.safeParse({ ...body, duration: "4200" }).success
    ).toBe(false);
    expect(durationSchema.safeParse({ ...body, vid: "" }).success).toBe(false);
  });

  it("bounds both ids and repairs what Postgres cannot compare", () => {
    expect(
      durationSchema.safeParse({ ...body, wid: "w".repeat(33) }).success
    ).toBe(false);
    expect(
      durationSchema.safeParse({ ...body, vid: "v".repeat(65) }).success
    ).toBe(false);
    expect(durationSchema.parse({ ...body, vid: `to${NUL}ken` }).vid).toBe(
      "token"
    );
    expect(durationSchema.safeParse({ ...body, vid: NUL }).success).toBe(false);
  });
});

describe("POST /collect/duration", () => {
  const body = { wid: "site-wid", vid: "0193b4a2-view-token", duration: 4200 };

  it("matches the view by website and token, naming the type", async () => {
    const response = await duration(body, { origin: "https://example.com" });

    expect(response.status).toBe(204);

    const [update] = stub.state.updates;
    const { params } = compile(update.where);

    expect(params).toEqual([SITE.id, body.vid, "pageview"]);

    /**
     * `greatest(coalesce(duration, 0), $1)` and not a bare `duration = $1`.
     *
     * Two beacons for one view are two independent requests — sendBeacon and
     * keepalive-fetch guarantee no ordering between them — while the tracker's
     * accumulator only ever grows. So a smaller value arriving second is always
     * a stale delivery, and the plain SET wrote it over the truth: a view
     * flushed at 20s and again at 120s, delivered in that reverse order, ended
     * up stored as 20s. Asserted as compiled SQL rather than as a shape,
     * because it is the SQL that has to be monotonic.
     */
    const set = compile(update.values.duration);

    expect(set.sql).toBe('greatest(coalesce("events"."duration", 0), $1)');
    expect(set.params).toEqual([4200]);
  });

  it("rejects a foreign origin and an unknown website", async () => {
    expect((await duration(body, { origin: "https://evil.test" })).status).toBe(
      403
    );

    stub.state.website = null;

    expect((await duration(body)).status).toBe(404);
    expect(stub.state.updates).toHaveLength(0);
  });

  it("rejects an unparseable body", async () => {
    expect(
      (
        await run<DurationArgs>(
          durationAction,
          request("not json", {}, "POST", "/collect/duration")
        )
      ).status
    ).toBe(422);
    expect(stub.state.updates).toHaveLength(0);
  });

  it("spends the same budget /collect does", async () => {
    for (let index = 0; index < 240; index += 1) {
      rateLimit("198.51.100.9");
    }

    const response = await duration(body, {
      "x-forwarded-for": "198.51.100.9",
    });

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(stub.state.lookups).toBe(0);
    expect(stub.state.updates).toHaveLength(0);
  });

  it("answers its own preflight and refuses other methods", async () => {
    const options = await run<DurationArgs>(
      durationLoader,
      request(
        "",
        { origin: "https://example.com" },
        "OPTIONS",
        "/collect/duration"
      )
    );

    expect(options.status).toBe(204);
    expect(options.headers.get("access-control-allow-methods")).toBe(
      "POST,OPTIONS"
    );
    expect(options.headers.get("vary")).toBe("Origin");

    const get = await run<DurationArgs>(
      durationLoader,
      request("", {}, "GET", "/collect/duration")
    );

    expect(get.status).toBe(405);

    const put = await run<DurationArgs>(
      durationAction,
      request("", {}, "PUT", "/collect/duration")
    );

    expect(put.status).toBe(405);
    expect(stub.state.updates).toHaveLength(0);
  });

  it("answers a failed UPDATE with its own 500", async () => {
    stub.state.insertError = Object.assign(new Error("deadlock"), {
      code: "40P01",
    });

    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await duration(body, { origin: "https://example.com" });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ message: "Internal error" });
      expect(response.headers.get("access-control-allow-origin")).toBe(
        "https://example.com"
      );
    } finally {
      error.mockRestore();
    }
  });
});

/**
 * The tracker and the two schemas above are one protocol, and reading both
 * sides is not evidence that they agree — a bound counted in the wrong units, a
 * field one side spells differently, a normalisation only one side performs: all
 * three read fine, and all three lose a beacon to a 422 that nothing on the page
 * can observe and no dashboard can distinguish from a quiet day.
 *
 * So the real bundle is booted against a real document here and every payload it
 * actually emits is parsed by the real schema that will receive it. The property
 * asserted throughout is stronger than "it parses": the schema has to be a no-op
 * on what the tracker sends, because anything it still normalises is a
 * normalisation the tracker was supposed to have done — and a stored path that
 * disagrees with the one the tracker dedupes against is a duplicate row on the
 * next view.
 */
describe("the tracker's own beacons", () => {
  type Beacon = { url: string; body: Record<string, unknown> };

  const SRC = "https://cdn.example/aurora/tracker.js";
  const COLLECT = "https://cdn.example/aurora/collect";
  const DURATION = "https://cdn.example/aurora/collect/duration";

  const PUSH = history.pushState;
  const REPLACE = history.replaceState;
  const SCREEN = Object.getOwnPropertyDescriptor(window, "screen");

  /**
   * The real shape of `navigator.userAgentData`, GREASE and all: Chromium pads
   * both brand lists with a randomised "Not A Brand" entry precisely so that a
   * server cannot match them literally.
   */
  const USER_AGENT_DATA = {
    brands: [
      { brand: "Not;A=Brand", version: "99" },
      { brand: "Google Chrome", version: "139" },
      { brand: "Chromium", version: "139" },
    ],
    mobile: false,
    platform: "Windows",
    getHighEntropyValues: () =>
      Promise.resolve({
        architecture: "x86",
        bitness: "64",
        brands: [
          { brand: "Not;A=Brand", version: "99" },
          { brand: "Google Chrome", version: "139" },
        ],
        fullVersionList: [
          { brand: "Not;A=Brand", version: "99.0.0.0" },
          { brand: "Google Chrome", version: "139.0.7258.67" },
        ],
        mobile: false,
        model: "",
        platform: "Windows",
        platformVersion: "15.0.0",
        uaFullVersion: "139.0.7258.67",
        wow64: false,
      }),
  };

  let beacons: Beacon[] = [];
  let listeners: Array<[EventTarget, string, any, any]> = [];
  let clock = 0;

  /**
   * The module patches history and registers listeners on globals this whole
   * file shares, and nothing can unregister an anonymous listener it did not
   * capture — so both are recorded on the way in and undone afterwards.
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

  const boot = async (
    url: string,
    options: { referrer?: string; hinted?: boolean } = {}
  ) => {
    beacons = [];
    listeners = [];
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
      ...(options.hinted ? { userAgentData: USER_AGENT_DATA } : {}),
    });

    const script = document.createElement("script");

    script.setAttribute("aurora-id", "site-wid");
    script.setAttribute("src", SRC);
    document.head.append(script);

    vi.resetModules();

    await import("../../../../../packages/tracker/src/index");
    await tick();
  };

  /** Every pageview and event beacon, parsed by the schema that receives it. */
  const parsed = () =>
    beacons
      .filter((beacon) => beacon.url === COLLECT)
      .map((beacon) => {
        const result = collectSchema.safeParse(beacon.body);

        // Surfaced as the message rather than as `success: false`, so a
        // divergence names the field it happened on.
        expect(result.error?.issues[0]?.message ?? "ok").toBe("ok");

        return result.data!;
      });

  afterEach(() => {
    for (const [target, type, listener, options] of listeners) {
      target.removeEventListener(type, listener, options);
    }

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
  });

  /**
   * The fragment rule stated once, as the fixed point it has to be. Both sides
   * hold it — the tracker so its dedupe compares the value the row will carry,
   * the route because the value arrives from an unauthenticated client on
   * somebody else's page — and the only way they can drift apart is if one is
   * changed without the other. Every `location` a browser can produce goes
   * through the tracker first, so the schema seeing anything left to normalise
   * is the drift itself.
   */
  it("normalises to a fixed point of this schema", () => {
    const locations: Array<[string, string]> = [
      ["/", ""],
      ["/pricing/", "#plans"],
      ["/", "#/settings"],
      ["/app/", "#/orders/42/"],
      ["/", "#/orders?page=2"],
      ["/", "#/"],
      ["/", "#"],
      ["/callback", "#access_token=ya29.a0AeXRPp&token_type=Bearer"],
      ["/", "#/callback&access_token=ya29.a0AeXRPp"],
      ["/", "#/callback#access_token=ya29.a0AeXRPp"],
      ["/docs/install", "#usage"],
    ];

    for (const [pathname, hash] of locations) {
      const location = pathname + hash;
      const sent = normalizePath(pathname, hash);
      const stored = collectSchema.parse({ ...pageview, path: sent }).path;

      // Compared as a pair so a failure names the location it happened on.
      expect({ location, stored }).toEqual({ location, stored: sent });
    }
  });

  it("posts a first pageview this schema accepts unchanged", async () => {
    await boot("/pricing/?utm_source=hn&utm_medium=social", {
      referrer: "https://news.ycombinator.com/item?id=1",
    });

    expect(beacons).toHaveLength(1);
    expect(beacons[0].url).toBe(COLLECT);
    expect(parsed()[0]).toMatchObject({
      wid: "site-wid",
      type: "pageview",
      // The trailing slash is already gone: the schema does not collapse one,
      // so only one side can, and this is the side that knows the two are a
      // single page.
      path: "/pricing",
      referrer: "https://news.ycombinator.com",
      language: "en-US",
      screen: 1920,
      utm: { source: "hn", medium: "social", campaign: null },
    });
  });

  it("posts a hash route the schema stores whole", async () => {
    await boot("/");

    // How `createHashRouter` moves: through history, so the patch sees it.
    history.pushState(null, "", "/#/orders?page=2");
    await tick();

    // How Vue Router's hash mode and a plain `<a href="#/settings">` move.
    at("/#/settings/");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await tick();

    const rows = parsed();

    expect(rows.map((row) => row.path)).toEqual([
      "/",
      "/#/orders",
      "/#/settings",
    ]);
    // Three views, three tokens: a hash route is a navigation, so it takes the
    // duration beacon and the bounce clear that a pushState takes.
    expect(new Set(rows.map((row) => row.vid)).size).toBe(3);
  });

  it("posts an anchor as the page it is a position inside", async () => {
    await boot("/docs");

    at("/docs#install");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await tick();

    // Nothing sent at all: the tracker dropped the fragment, and the schema
    // would have dropped it too had one arrived.
    expect(beacons).toHaveLength(1);
    expect(parsed()[0].path).toBe("/docs");
  });

  it("posts a correction carrying only the fields that address a row", async () => {
    await boot("/");

    clock = 50;
    history.replaceState(null, "", "/login");
    await tick();

    const [first, correction] = parsed();

    expect(correction).toEqual({
      wid: "site-wid",
      type: "pageview",
      vid: first.vid,
      path: "/login",
      corrects: true,
    });
  });

  it("posts a custom event this schema accepts whole", async () => {
    await boot("/checkout");

    fire("purchase", {
      props: { plan: "pro", seats: 4, trial: false },
      revenue: { amount: 49, currency: "eur" },
    });

    expect(parsed()[1]).toMatchObject({
      type: "event",
      name: "purchase",
      path: "/checkout",
      props: { plan: "pro", seats: 4, trial: false },
      revenue: { amount: 49, currency: "EUR" },
    });
  });

  it("posts a platform version this schema takes", async () => {
    await boot("/", { hinted: true });

    history.pushState(null, "", "/b");
    await tick();

    const rows = parsed();

    // The first view never waits for the promise; the ones after it carry the
    // answer raw, because only the server holds the table that turns a Windows
    // platform version of 15 into the release 11.
    expect(rows[0]).not.toHaveProperty("platformVersion");
    expect(rows[1].platformVersion).toBe("15.0.0");
    // And nothing the tracker did not ask for rides along with it: the GREASE
    // brands are discarded where they are read, not where they are stored.
    expect(JSON.stringify(beacons)).not.toMatch(/brand|model|bitness/i);
  });

  it("posts a duration the other schema accepts", async () => {
    await boot("/");

    clock = 7_000;
    window.dispatchEvent(new Event("pagehide"));

    const beacon = beacons.find((entry) => entry.url === DURATION);
    const result = durationSchema.safeParse(beacon?.body);

    expect(result.error?.issues[0]?.message ?? "ok").toBe("ok");
    expect(result.data).toEqual({
      wid: "site-wid",
      vid: parsed()[0].vid,
      duration: 7_000,
    });
  });

  /**
   * The tracker clamps by UTF-8 bytes because the schema bounds by UTF-8 bytes,
   * and `String.length` disagrees with both on every non-ASCII page. One value
   * over the line is a 422 for the whole beacon, so a clamp measured in the
   * wrong units loses entire pageviews rather than a field.
   */
  it("clamps to values this schema accepts rather than losing the beacon", async () => {
    await boot(`/${"p".repeat(2_000)}`, {
      referrer: `https://${"a".repeat(1_200)}.example/page`,
    });

    fire("é".repeat(400), {
      props: Object.fromEntries(
        Array.from({ length: 40 }, (_, index) => [
          `é${index}${"k".repeat(200)}`,
          "é".repeat(900),
        ])
      ),
    });

    const [view, event] = parsed();

    expect(Buffer.byteLength(view.path, "utf8")).toBe(1_024);
    expect(Buffer.byteLength(view.referrer ?? "", "utf8")).toBe(1_024);
    expect(Buffer.byteLength(event.name ?? "", "utf8")).toBe(200);
    expect(Object.keys(event.props ?? {})).toHaveLength(24);
  });
});
