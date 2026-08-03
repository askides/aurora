import { createId } from "~/db/id";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
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

export const events = pgTable(
  "events",
  {
    id: id(),
    // Matches the literal the tracker sends and the pages query filters on.
    type: text("type").notNull().default("pageView"),
    element: text("element").notNull(),
    // Nullable: "never measured" must stay distinguishable from "lasted 0ms",
    // otherwise unreported pageviews drag the average visit time down.
    duration: doublePrecision("duration"),
    is_new_visitor: boolean("is_new_visitor").notNull().default(false),
    is_new_session: boolean("is_new_session").notNull().default(false),
    is_a_bounce: boolean("is_a_bounce").notNull().default(false),
    website_id: text("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    created_at: createdAt(6),
    updated_at: updatedAt(6),
  },
  (t) => [
    // Every dashboard panel filters website_id then ranges over created_at.
    index("events_website_id_created_at_idx").on(t.website_id, t.created_at),
    // /collect is unauthenticated, so a client could otherwise post a negative
    // or absurd duration and skew a site's average permanently. The upper bound
    // also rejects NaN, which Postgres sorts above every finite value.
    check(
      "events_duration_range",
      sql`${t.duration} IS NULL OR (${t.duration} >= 0 AND ${t.duration} <= 86400000)`
    ),
  ]
);

/**
 * Shared dimension values (browser, os, engine, device, referrer, locale).
 * `version` is NOT NULL with an empty-string default rather than nullable:
 * Postgres treats NULLs as distinct, so a nullable column would defeat the
 * unique key for the three dimensions that carry no version.
 */
export const metadata = pgTable(
  "metadata",
  {
    id: id(),
    type: text("type").notNull(),
    value: text("value").notNull(),
    version: text("version").notNull().default(""),
    created_at: createdAt(3),
    updated_at: updatedAt(3),
  },
  (t) => [
    // Lets the ingest path use a single ON CONFLICT upsert instead of a
    // serial find-then-create that races and sequential-scans.
    unique("metadata_type_value_version_key").on(t.type, t.value, t.version),
  ]
);

/**
 * Explicit join table. Prisma generated this implicitly as "_EventToMetadata";
 * Drizzle has no implicit many-to-many, so it is declared with a proper
 * composite primary key.
 */
export const eventMetadata = pgTable(
  "event_metadata",
  {
    event_id: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    metadata_id: text("metadata_id")
      .notNull()
      .references(() => metadata.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.event_id, t.metadata_id] }),
    index("event_metadata_metadata_id_idx").on(t.metadata_id),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  websites: many(websites),
}));

export const websitesRelations = relations(websites, ({ one, many }) => ({
  user: one(users, { fields: [websites.user_id], references: [users.id] }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  website: one(websites, {
    fields: [events.website_id],
    references: [websites.id],
  }),
  metadata: many(eventMetadata),
}));

export const metadataRelations = relations(metadata, ({ many }) => ({
  events: many(eventMetadata),
}));

export const eventMetadataRelations = relations(eventMetadata, ({ one }) => ({
  event: one(events, {
    fields: [eventMetadata.event_id],
    references: [events.id],
  }),
  metadata: one(metadata, {
    fields: [eventMetadata.metadata_id],
    references: [metadata.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Website = typeof websites.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Metadata = typeof metadata.$inferSelect;
