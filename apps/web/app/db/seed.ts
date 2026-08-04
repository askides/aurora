import { events, users, websites } from "./schema";
import { faker } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/node-postgres";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { createId } from "./id";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { casing: "snake_case" });

// Fixed, so a screenshot taken against one seeded database still matches the
// next one and a regression in a metric is visible rather than plausible noise.
faker.seed(20260804);

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Long enough that the 7 and 30 day presets both have history behind them and
 * the previous-window comparison has something to compare against.
 */
const DAYS = 60;

type EventRow = typeof events.$inferInsert;

type Device = Pick<
  EventRow,
  | "browser"
  | "browser_version"
  | "os"
  | "os_version"
  | "device"
  | "screen_class"
>;

type Place = Pick<EventRow, "country" | "locale">;

type Source = Pick<
  EventRow,
  | "referrer_host"
  | "channel"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_term"
  | "utm_content"
>;

/**
 * Whole devices rather than a cross product of the columns: the breakdowns only
 * read as real traffic if Safari appears on macOS and iOS and never on Windows.
 * Two rows carry no version — UA reduction hides it in the field, and the new
 * schema is meant to keep the name in that case instead of dropping the row.
 */
const DEVICES: Device[] = [
  {
    browser: "Chrome",
    browser_version: "139",
    os: "Windows",
    os_version: "10",
    device: "desktop",
    screen_class: "desktop",
  },
  {
    browser: "Chrome",
    browser_version: "138",
    os: "Windows",
    os_version: "11",
    device: "desktop",
    screen_class: "laptop",
  },
  {
    browser: "Safari",
    browser_version: "18",
    os: "macOS",
    os_version: "15",
    device: "desktop",
    screen_class: "laptop",
  },
  {
    browser: "Firefox",
    browser_version: "131",
    os: "Linux",
    os_version: null,
    device: "desktop",
    screen_class: "desktop",
  },
  {
    browser: "Edge",
    browser_version: "139",
    os: "Windows",
    os_version: "11",
    device: "desktop",
    screen_class: "laptop",
  },
  {
    browser: "Mobile Safari",
    browser_version: "18",
    os: "iOS",
    os_version: "18",
    device: "mobile",
    screen_class: "mobile",
  },
  {
    browser: "Chrome",
    browser_version: "139",
    os: "Android",
    os_version: "15",
    device: "mobile",
    screen_class: "mobile",
  },
  {
    browser: "Samsung Internet",
    browser_version: null,
    os: "Android",
    os_version: "14",
    device: "mobile",
    screen_class: "mobile",
  },
  {
    browser: "Mobile Safari",
    browser_version: "18",
    os: "iPadOS",
    os_version: "18",
    device: "tablet",
    screen_class: "tablet",
  },
];

/** The last row has no country: a self-hoster behind a plain reverse proxy gets
 * no geo header, and every panel has to survive that. */
const PLACES: Place[] = [
  { country: "US", locale: "en-US" },
  { country: "GB", locale: "en-GB" },
  { country: "IT", locale: "it-IT" },
  { country: "DE", locale: "de-DE" },
  { country: "FR", locale: "fr-FR" },
  { country: "ES", locale: "es-ES" },
  { country: "BR", locale: "pt-BR" },
  { country: "JP", locale: "ja-JP" },
  { country: "IN", locale: "en-IN" },
  { country: null, locale: "nl-NL" },
];

const NO_UTM = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
};

/**
 * Acquisition is a property of the whole session, not of each hit:
 * `document.referrer` survives a pushState, so every event of a visit carries
 * the same host and channel. Weighted to the usual shape — search and direct
 * dominate, paid is a sliver — so the channel panel is not a flat bar chart.
 */
const SOURCES: { weight: number; value: Source }[] = [
  { weight: 26, value: { referrer_host: null, channel: "direct", ...NO_UTM } },
  {
    weight: 20,
    value: { referrer_host: "google.com", channel: "search", ...NO_UTM },
  },
  {
    weight: 6,
    value: { referrer_host: "duckduckgo.com", channel: "search", ...NO_UTM },
  },
  {
    weight: 4,
    value: { referrer_host: "bing.com", channel: "search", ...NO_UTM },
  },
  {
    weight: 8,
    value: {
      referrer_host: "news.ycombinator.com",
      channel: "social",
      ...NO_UTM,
    },
  },
  {
    weight: 7,
    value: { referrer_host: "x.com", channel: "social", ...NO_UTM },
  },
  {
    weight: 5,
    value: { referrer_host: "reddit.com", channel: "social", ...NO_UTM },
  },
  {
    weight: 4,
    value: { referrer_host: "linkedin.com", channel: "social", ...NO_UTM },
  },
  {
    weight: 5,
    value: { referrer_host: "github.com", channel: "referral", ...NO_UTM },
  },
  {
    weight: 3,
    value: { referrer_host: "producthunt.com", channel: "referral", ...NO_UTM },
  },
  {
    weight: 6,
    value: {
      referrer_host: "t.co",
      channel: "campaign",
      utm_source: "twitter",
      utm_medium: "social",
      utm_campaign: "launch-week",
      utm_term: null,
      utm_content: "hero-card",
    },
  },
  {
    weight: 4,
    value: {
      referrer_host: null,
      channel: "campaign",
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: "monthly-digest",
      utm_term: null,
      utm_content: "issue-14",
    },
  },
  {
    weight: 2,
    value: {
      referrer_host: "google.com",
      channel: "campaign",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "brand",
      utm_term: "web analytics",
      utm_content: "ad-b",
    },
  },
];

/** Most visits land on one page and leave; without that skew the bounce rate
 * comes out at a number no real site has ever reported. */
const VIEWS_PER_SESSION = [
  { weight: 45, value: 1 },
  { weight: 25, value: 2 },
  { weight: 15, value: 3 },
  { weight: 9, value: 4 },
  { weight: 6, value: 5 },
];

/** Office hours in UTC, so the hourly buckets have a shape to draw. */
const START_HOURS = [
  { weight: 1, value: [0, 6] },
  { weight: 6, value: [7, 12] },
  { weight: 8, value: [13, 18] },
  { weight: 4, value: [19, 23] },
];

const SITES = [
  {
    name: "Aurora",
    url: "https://aurora.dev",
    is_public: true,
    paths: [
      { weight: 30, value: "/" },
      { weight: 14, value: "/pricing" },
      { weight: 12, value: "/docs/install" },
      { weight: 9, value: "/docs/tracker" },
      { weight: 8, value: "/blog/cookie-free-analytics" },
      { weight: 6, value: "/changelog" },
      { weight: 5, value: "/docs/self-hosting" },
      { weight: 4, value: "/signin" },
    ],
  },
  {
    name: "Field Notes",
    url: "https://notes.example.com",
    is_public: false,
    paths: [
      { weight: 26, value: "/" },
      { weight: 18, value: "/posts/postgres-index-only-scans" },
      { weight: 13, value: "/posts/what-a-cookie-actually-is" },
      { weight: 10, value: "/posts/reading-explain-analyze" },
      { weight: 7, value: "/archive" },
      { weight: 5, value: "/about" },
    ],
  },
];

const CUSTOM_EVENTS = [
  { weight: 6, value: "signup_started" },
  { weight: 3, value: "signup_completed" },
  { weight: 5, value: "docs_search" },
  { weight: 4, value: "newsletter_subscribe" },
  { weight: 2, value: "checkout_completed" },
];

function propsFor(name: string): EventRow["props"] {
  switch (name) {
    case "docs_search":
      return {
        query: faker.hacker.noun(),
        results: faker.number.int({ min: 0, max: 20 }),
      };
    case "newsletter_subscribe":
      return { placement: faker.helpers.arrayElement(["footer", "post-end"]) };
    default:
      return {
        plan: faker.helpers.arrayElement(["free", "pro", "team"]),
        seats: faker.number.int({ min: 1, max: 25 }),
      };
  }
}

/**
 * Shaped like the real derivation (an HMAC over the UTC date, site, ip and user
 * agent): the id has to rotate at midnight or the seeded "unique visitors"
 * would not mean what the dashboard says it means.
 */
function visitorId(utcDate: string, wid: string, person: number) {
  return createHash("sha256")
    .update(`${utcDate}:${wid}:${person}`)
    .digest("base64url")
    .slice(0, 22);
}

function generate(
  website: { id: string },
  paths: { weight: number; value: string }[]
) {
  const rows: EventRow[] = [];
  const now = Date.now();
  const startOfToday = Math.floor(now / DAY_MS) * DAY_MS;

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const dayStart = startOfToday - daysAgo * DAY_MS;
    const day = new Date(dayStart);
    const utcDate = day.toISOString().slice(0, 10);
    const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;

    // A slow ramp with a weekend dip, so the window-over-window comparison on
    // the dashboard has a trend to report instead of flat noise.
    const growth = 0.55 + (0.45 * (DAYS - daysAgo)) / DAYS;
    const sessions = Math.round(
      faker.number.int({ min: 14, max: 26 }) * growth * (weekend ? 0.6 : 1)
    );

    // A person visiting twice in a day is one unique visitor, and the ingest
    // path learns that from the visitor's own earlier row rather than a flag.
    const seen = new Set<string>();

    for (let i = 0; i < sessions; i++) {
      const person = faker.number.int({ min: 1, max: 220 });
      const visitor_id = visitorId(utcDate, website.id, person);

      // Indexed off the person, not drawn fresh: a reader keeps their phone and
      // their country between visits, and a browser panel where they do not is
      // the kind of data nobody would ship a screenshot of.
      const device = DEVICES[person % DEVICES.length];
      const place = PLACES[(person * 7) % PLACES.length];
      const source = faker.helpers.weightedArrayElement(SOURCES);

      const [fromHour, toHour] =
        faker.helpers.weightedArrayElement(START_HOURS);
      let at =
        dayStart +
        faker.number.int({ min: fromHour, max: toHour }) * HOUR_MS +
        faker.number.int({ min: 0, max: HOUR_MS - 1 });

      if (at >= now) {
        continue;
      }

      const views = faker.helpers.weightedArrayElement(VIEWS_PER_SESSION);
      const session_id = createId();
      const is_new_visitor = !seen.has(visitor_id);

      seen.add(visitor_id);

      for (let view = 0; view < views && at < now; view++) {
        // The dwell time is the gap to the next view, so summing durations
        // across a session lands on the same figure the timeline shows.
        const gap = faker.number.int({ min: 20_000, max: 5 * MINUTE_MS });
        const path = faker.helpers.weightedArrayElement(paths);

        rows.push({
          website_id: website.id,
          type: "pageview",
          name: null,
          path,
          view_token: faker.string.uuid(),
          visitor_id,
          session_id,
          is_new_visitor: is_new_visitor && view === 0,
          is_new_session: view === 0,
          // Cleared on every earlier row the moment a second view arrives, so
          // a bounce is only ever a session that stopped at one page.
          is_a_bounce: views === 1,
          // A slice of pageviews never report: the beacon is lost, or the tab
          // is killed. Those have to stay null rather than count as zero.
          duration: faker.datatype.boolean({ probability: 0.12 }) ? null : gap,
          ...source,
          ...device,
          ...place,
          props: null,
          revenue: null,
          currency: null,
          created_at: new Date(at),
        });

        if (faker.datatype.boolean({ probability: 0.07 })) {
          const name = faker.helpers.weightedArrayElement(CUSTOM_EVENTS);
          const paid = name === "checkout_completed";

          rows.push({
            website_id: website.id,
            type: "event",
            name,
            path,
            // Custom events join the session but never open one, carry no
            // duration beacon, and must stay out of the pageview counters.
            view_token: null,
            visitor_id,
            session_id,
            is_new_visitor: false,
            is_new_session: false,
            is_a_bounce: false,
            duration: null,
            ...source,
            ...device,
            ...place,
            props: propsFor(name),
            revenue: paid
              ? faker.number.float({ min: 9, max: 499, fractionDigits: 2 })
              : null,
            currency: paid
              ? faker.helpers.arrayElement(["EUR", "USD", "GBP"])
              : null,
            created_at: new Date(
              at + faker.number.int({ min: 1_000, max: 30_000 })
            ),
          });
        }

        at += gap;
      }
    }
  }

  return rows;
}

/** Postgres caps a statement at 65535 bound parameters and every event binds
 * one per column, so the batch has to stay well under two thousand rows. */
function batches<T>(rows: T[], size: number) {
  const out: T[][] = [];

  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size));
  }

  return out;
}

async function main() {
  const [user] = await db
    .insert(users)
    .values({
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      // bcrypt hash of "password"
      password: "$2a$10$6m.u36XdklkkMYZ01tSPXexVLXMmS.BM1AVcYtOg3fCtsu9EmyqOy",
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  // Gated on the user being new: a second run would otherwise stack another two
  // months of traffic on top of the first and every figure would double.
  if (!user) {
    console.log("user already present, nothing to seed");
    return;
  }

  const created = await db
    .insert(websites)
    .values(
      SITES.map((site) => ({
        name: site.name,
        url: site.url,
        is_public: site.is_public,
        user_id: user.id,
      }))
    )
    .returning();

  const rows = created.flatMap((website, index) =>
    generate(website, SITES[index].paths)
  );

  for (const batch of batches(rows, 500)) {
    await db.insert(events).values(batch);
  }

  console.log(
    `${user.email}: ${created.length} websites, ${rows.length} events over ${DAYS} days`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
