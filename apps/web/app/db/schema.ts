import { createId } from "~/db/id";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Drizzle has no `@default(cuid())` or `@updatedAt`, so both are explicit here.
 * Every timestamp is `timestamptz` — the timeseries query does
 * `created_at AT TIME ZONE $tz`, which only yields correct buckets when the
 * column stores an instant rather than a naive local time.
 */
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

const createdAt = (precision: 3 | 6) =>
  timestamp("created_at", { withTimezone: true, precision })
    .notNull()
    .defaultNow();

const updatedAt = (precision: 3 | 6) =>
  timestamp("updated_at", { withTimezone: true, precision })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable("users", {
  id: id(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  created_at: createdAt(3),
  updated_at: updatedAt(3),
});

export const websites = pgTable(
  "websites",
  {
    id: id(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    is_public: boolean("is_public").notNull().default(false),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: createdAt(3),
    updated_at: updatedAt(3),
  },
  // Postgres does not index foreign key columns automatically, and deleting a
  // user has to scan this table to cascade.
  (t) => [index("websites_user_id_idx").on(t.user_id)]
);

/** A pageview or a named custom event; the check constraint below pins both. */
export type EventType = "pageview" | "event";

/**
 * How the visit was acquired. Resolved once at ingest from the referrer host
 * and the utm params, because deriving it at read time would mean carrying the
 * search/social host lists into every breakdown query.
 */
export type ChannelType =
  | "direct"
  | "search"
  | "social"
  | "referral"
  | "campaign";

/**
 * Form factor as the user agent reports it. A guess about the kind of device,
 * which is a different question from how much room the page actually got.
 */
export type DeviceType = "desktop" | "mobile" | "tablet";

/**
 * Bucketed at ingest from the reported screen width in CSS px:
 * `< 640` mobile, `< 1024` tablet, `< 1536` laptop, else desktop.
 */
export type ScreenClass = "mobile" | "tablet" | "laptop" | "desktop";

/** Bounded at ingest to scalars so one event cannot carry a whole document. */
export type EventProps = Record<string, string | number | boolean>;

/**
 * Every dimension is a column on the event.
 *
 * The previous shape normalised them into `metadata` + `event_metadata`, which
 * cost a multi-row upsert on every ingest and two joins on every panel to
 * answer "group by browser". Normalisation pays for values that are large and
 * shared; these are short, low-cardinality strings, so it only bought write
 * amplification and a query layer that could not express `count(DISTINCT
 * visitor_id)` without a subselect.
 */
export const events = pgTable(
  "events",
  {
    id: id(),
    website_id: text("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    type: text("type").$type<EventType>().notNull().default("pageview"),
    // Only custom events are named; a pageview is identified by its path.
    name: text("name"),
    path: text("path").notNull(),
    /**
     * The tracker's per-pageview token, the key the duration beacon matches on.
     * It exists so the event id never has to be handed to a third-party origin,
     * and it is null on rows no duration beacon can ever refer to.
     *
     * Ingest contract, enforced by the partial unique index below: mint a fresh
     * token per pageview, leave it null on custom events, and translate a 23505
     * from the insert into a 204 rather than a 500 — the token arrives from an
     * unauthenticated client, so a replayed one is a request to ignore, not an
     * error. Uniqueness is what bounds the duration UPDATE to a single row;
     * without it one replayed beacon rewrites every row sharing the token.
     */
    view_token: text("view_token"),
    /**
     * HMAC over the UTC date, site, IP and user agent. It rotates at midnight
     * UTC, so it is a daily pseudonym rather than a device id — which is both
     * the reason no consent is needed and the definition of "unique visitor"
     * the dashboard reports.
     */
    visitor_id: text("visitor_id").notNull(),
    session_id: text("session_id").notNull(),
    is_new_visitor: boolean("is_new_visitor").notNull().default(false),
    is_new_session: boolean("is_new_session").notNull().default(false),
    is_a_bounce: boolean("is_a_bounce").notNull().default(false),
    // Nullable: "never measured" must stay distinguishable from "lasted 0ms",
    // otherwise unreported pageviews drag the average visit time down.
    duration: doublePrecision("duration"),
    // Hostname only, `www.` stripped, self-referrals dropped. The full URL is a
    // path on somebody else's site: PII we would never display and must not
    // keep just because the browser offered it.
    referrer_host: text("referrer_host"),
    channel: text("channel").$type<ChannelType>().notNull(),
    utm_source: text("utm_source"),
    utm_medium: text("utm_medium"),
    utm_campaign: text("utm_campaign"),
    utm_term: text("utm_term"),
    utm_content: text("utm_content"),
    browser: text("browser"),
    /**
     * Major only ("139"). A full version string buckets one row per Chrome
     * patch release and turns the panel into a histogram of noise. Null when
     * UA reduction hides it — the name still counts, which is the bug the old
     * all-or-nothing dimension had.
     */
    browser_version: text("browser_version"),
    os: text("os"),
    os_version: text("os_version"),
    device: text("device").$type<DeviceType>(),
    /**
     * Bucketed from the reported screen width, deliberately kept alongside
     * `device`: the user agent only ever claims a form factor, and it cannot
     * tell a 13" laptop from a 32" monitor — both are `device = 'desktop'`.
     * The screen class is the one that answers "which breakpoint do these
     * readers actually land on", which is the question a layout change needs.
     */
    screen_class: text("screen_class").$type<ScreenClass>(),
    // ISO-3166-1 alpha-2, from edge headers only. Null wherever the deployment
    // has no geo-aware proxy in front, which is a supported setup and must not
    // read as an error anywhere downstream.
    country: text("country"),
    // BCP-47, kept apart from `country`: the browser language says who the
    // reader is, the edge header says where they are, and they disagree often.
    locale: text("locale"),
    props: jsonb("props").$type<EventProps>(),
    /**
     * Split from `currency` so revenue stays summable in SQL; one text column
     * holding "49 EUR" would push parsing into every aggregate.
     *
     * `numeric` rather than `double precision`, which is the one type where
     * that sum is wrong: float8 addition is inexact and non-associative, so a
     * hundred rows totalling 26.99 come back as 26.990000000000027 and the
     * figure changes with the scan order. `sum(numeric)` arrives from pg as a
     * string, so an aggregate annotated `sql<number>` needs `::float8` on the
     * way out — a rounding at the display edge instead of in the ledger.
     */
    revenue: numeric("revenue", { precision: 14, scale: 2, mode: "number" }),
    currency: text("currency"),
    created_at: createdAt(6),
    updated_at: updatedAt(6),
  },
  // The migration also sets `fillfactor = 80` and a tighter autovacuum
  // threshold on this table. Neither is expressible here — drizzle has no
  // table-level storage-parameter API — and drizzle-kit does not read
  // `reloptions` when it introspects, so the hand-written line is invisible to
  // `db:push` rather than a source of churn. It matters because every pageview
  // is UPDATEd at least once by the duration beacon: none of the indexes below
  // touch `duration`, `is_a_bounce` or `updated_at`, so those updates are
  // HOT-eligible and cost no index writes at all, but HOT also needs free space
  // on the same heap page, which a fillfactor of 100 never leaves. Measured on
  // this write pattern it is the difference between 3% and 38% HOT updates at
  // the same total size; the numbers are in the migration.
  //
  // Keep it in mind before adding an index here: putting any of those three
  // columns into a key or a predicate gives that back up.
  (t) => [
    // Every dashboard panel filters website_id then ranges over created_at,
    // and every pageview metric also filters type so custom events cannot
    // inflate it. type sits in the middle so that qual is an access-path
    // boundary rather than a heap-side filter — Postgres 16 has no skip scan,
    // so a trailing type column would mean reading and discarding every custom
    // event in the window, nine times per dashboard render.
    index("events_website_id_type_created_at_idx").on(
      t.website_id,
      t.type,
      t.created_at
    ),
    // Sessionization reads the visitor's latest event on every single ingest,
    // so this index sits on the write path and cannot be allowed to seq-scan.
    // Descending makes that lookup a one-row backwards walk with no sort.
    //
    // `t.created_at.desc()` and not `desc(t.created_at)`: the latter is the
    // ORDER BY helper and lands in the index as an opaque SQL expression that
    // drizzle-kit cannot match against pg_index, so every `db:push` would drop
    // and rebuild the largest index on the hottest table.
    //
    // `.nullsFirst()` is not redundant. Drizzle defaults a descending index
    // column to NULLS LAST, Postgres defaults `ORDER BY x DESC` to NULLS FIRST,
    // and the planner compares those two literally rather than noticing that
    // the column is NOT NULL — so the default spelling puts a Sort back on top
    // of the scan and the lookup this index exists for stops being sortless.
    index("events_website_id_visitor_id_created_at_idx").on(
      t.website_id,
      t.visitor_id,
      t.created_at.desc().nullsFirst()
    ),
    // The duration beacon finds its pageview by token, and unique is what keeps
    // that UPDATE to one row: the token is client-supplied over an
    // unauthenticated endpoint, so without it a client can mint N pageviews
    // sharing a token and rewrite all N with one beacon. The predicate names
    // `type` as well as `view_token IS NOT NULL` so the implication "has a
    // token" -> "is a pageview" is held by the database rather than by the
    // ingest route remembering to null the column on custom events; it also
    // keeps the index a fraction of the table, and stops a beacon attaching a
    // duration to a custom event that per-session visit duration would sum.
    // Neither predicate column is ever updated, so this does not cost HOT.
    uniqueIndex("events_website_id_view_token_idx")
      .on(t.website_id, t.view_token)
      .where(sql`${t.view_token} IS NOT NULL AND ${t.type} = 'pageview'`),
    // A second view retroactively clears is_a_bounce on every earlier row of
    // the session, once per ingest, and the bounce rate groups by the same key.
    //
    // That UPDATE must carry `AND is_a_bounce AND type = 'pageview'`: only the
    // session's first pageview can hold the flag, and without the predicate the
    // statement rewrites every prior row of the session on every view — 1225
    // row versions for a 50-view session. Do not express it by making this
    // index partial instead: Postgres counts index predicate columns as
    // modified-attribute blockers, so putting is_a_bounce in the predicate is
    // exactly what would turn the bounce clear into a non-HOT update.
    index("events_website_id_session_id_idx").on(t.website_id, t.session_id),
    // /collect is unauthenticated, so a client could otherwise post a negative
    // or absurd duration and skew a site's average permanently. The upper bound
    // also rejects NaN, which Postgres sorts above every finite value.
    check(
      "events_duration_range",
      sql`${t.duration} IS NULL OR (${t.duration} >= 0 AND ${t.duration} <= 86400000)`
    ),
    // The four closed sets below are unions in TypeScript, which is a claim
    // about the code that writes the column and says nothing about the column.
    // Every one of them is resolved once at ingest and grouped on at read time,
    // so an unexpected value would not fail anything: it would quietly stop
    // being counted anywhere, which is the failure that takes longest to see.
    check("events_type_valid", sql`${t.type} IN ('pageview', 'event')`),
    check(
      "events_channel_valid",
      sql`${t.channel} IN ('direct', 'search', 'social', 'referral', 'campaign')`
    ),
    check(
      "events_device_valid",
      sql`${t.device} IS NULL OR ${t.device} IN ('desktop', 'mobile', 'tablet')`
    ),
    check(
      "events_screen_class_valid",
      sql`${t.screen_class} IS NULL OR ${t.screen_class} IN ('mobile', 'tablet', 'laptop', 'desktop')`
    ),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  websites: many(websites),
}));

export const websitesRelations = relations(websites, ({ one, many }) => ({
  user: one(users, { fields: [websites.user_id], references: [users.id] }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  website: one(websites, {
    fields: [events.website_id],
    references: [websites.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Website = typeof websites.$inferSelect;
export type Event = typeof events.$inferSelect;
