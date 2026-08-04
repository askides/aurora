-- drizzle runs this whole file inside one transaction, and the first statement
-- takes ACCESS EXCLUSIVE on "events" and holds it until COMMIT: reads and
-- ingest are blocked for the duration. Nothing here can avoid that lock — every
-- ADD COLUMN takes it too, and CREATE INDEX CONCURRENTLY is not allowed in a
-- transaction — so the only lever is how much work happens under it. Hence the
-- single backfill pass further down: the obvious shape, one UPDATE per
-- dimension, rewrites every row six or seven times, which on a 50M-row install
-- is tens of GB of transient heap that cannot be reclaimed until commit and an
-- outage measured in the tens of minutes.

-- drizzle-kit cannot see a rename, so it emitted DROP "element" + ADD "path"
-- text NOT NULL: that discards every path ever recorded and then aborts on the
-- first surviving row. The rename keeps the data and the NOT NULL that
-- "element" already carried.
ALTER TABLE "events" RENAME COLUMN "element" TO "path";--> statement-breakpoint
-- The check constraint at the end of this file admits 'pageview' and 'event'
-- only, so every other value has to be folded onto one of them first or the
-- validation scan aborts the entire migration and leaves the operator with no
-- indication of which rows were at fault.
--
-- More than one literal is in play. The Prisma-era column default was
-- 'pageview' and the Drizzle 0000 baseline default was 'pageView', so an
-- install spanning both eras holds a mix. Worse, the pre-Drizzle ingest
-- endpoint validated this field as `z.string().optional()` on an
-- unauthenticated CORS-open route, so the column can hold literally any string
-- a client ever posted. Anything that is not recognisably a pageview lands on
-- 'event', where it stays out of every pageview metric — the safe direction,
-- since the alternative is inflating the headline numbers with garbage.
UPDATE "events" SET
	"type" = CASE WHEN lower("type") = 'pageview' THEN 'pageview' ELSE 'event' END
WHERE "type" NOT IN ('pageview', 'event');--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "type" SET DEFAULT 'pageview';--> statement-breakpoint
-- Dropped before the backfill rather than after: it is replaced by
-- "events_website_id_type_created_at_idx" below, and every index still standing
-- during the rewrite costs one more index tuple per row.
DROP INDEX "events_website_id_created_at_idx";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "view_token" text;--> statement-breakpoint
-- "visitor_id", "session_id" and "channel" are NOT NULL in the schema, and
-- drizzle-kit emitted them as ADD COLUMN ... NOT NULL with no default, which
-- Postgres refuses on a table that already has rows. They arrive nullable, get
-- backfilled below, and take the constraint afterwards.
ALTER TABLE "events" ADD COLUMN "visitor_id" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "referrer_host" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "channel" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "utm_term" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "utm_content" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "browser" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "browser_version" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "os" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "os_version" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "device" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "screen_class" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "props" jsonb;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "revenue" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "currency" text;--> statement-breakpoint
-- Storage parameters, which drizzle has no API for and drizzle-kit does not
-- read back when it introspects — so this line lives only here and will not
-- show up as drift on the next `db:push`.
--
-- fillfactor: every pageview is UPDATEd at least once after insert (the
-- duration beacon, and the bounce clear on a second view). No index touches
-- "duration", "is_a_bounce" or "updated_at", so those updates are HOT-eligible
-- and cost zero index writes — but HOT also needs free space on the same heap
-- page, which the default fillfactor of 100 never leaves. Set before the
-- backfill so the rewritten heap already has the free space.
--
-- 80 is measured, not guessed. Simulating this table's write pattern (batched
-- inserts, 7% custom events, a duration beacon for 88% of pageviews one batch
-- later, bounce clears on a third of them) over 10,000 rows:
--
--   fillfactor  100    90    80    70    50
--   HOT updates 3.3%  19.6% 37.5% 50.4% 87.1%
--   heap+index  5552  5544  5568  5640  5576  kB
--
-- Total size barely moves across the range — the index tuples a HOT update
-- does not write pay for the heap the reserve costs — so the only real trade
-- is heap density, and 80 buys an order of magnitude more HOT updates for 2.7%
-- more heap. Lower values keep winning on this workload but only while nearly
-- every row really is updated once; if beacons stop arriving (ad blockers eat
-- the unload beacon) the reserve is simply wasted, and 80 stays reasonable in
-- that case where 50 does not.
--
-- autovacuum_vacuum_scale_factor: the default 0.2 means a large table waits for
-- 20% churn before a vacuum, so the visibility map stays stale exactly over the
-- recent rows every dashboard window reads.
ALTER TABLE "events" SET (fillfactor = 80, autovacuum_vacuum_scale_factor = 0.02);--> statement-breakpoint
-- One pass, deliberately. Every dimension recorded so far lives in the two
-- tables dropped further down; the ones that still have a home on "events" are
-- moved across, and the identity columns are filled, in a single UPDATE so each
-- row is rewritten exactly once instead of once per dimension. "engine" has no
-- target column and is dropped with the tables.
--
-- Referrers were stored as the full URL, which is a path on somebody else's
-- site and must not survive into the new column: only the host crosses over,
-- lowercased (hostnames are case-insensitive, and `Example.com` and
-- `example.com` would otherwise be two rows in the breakdown forever), any
-- userinfo dropped, `www.` stripped, and self-referrals discarded.
--
-- The two hosts are extracted with deliberately different expressions. On the
-- referrer side the scheme is required: `document.referrer` is always absolute,
-- and the legacy ingest also wrote the literal sentinel 'Direct' into this
-- column, which a scheme-optional pattern would happily parse into a referrer
-- host named "direct". On the site side it is optional, because
-- "websites"."url" is not a validated URL — the form accepts `example.com` and
-- `https://WWW.Example.org` alike, and requiring a scheme there yields NULL,
-- which `IS DISTINCT FROM` then treats as "not a self-referral" and lets the
-- site's own domain through as its top referrer.
--
-- Channel cannot be reconstructed beyond "something linked here" without the
-- search/social host lists, so rows with a surviving referrer land on
-- 'referral' and the rest on 'direct'.
--
-- No visitor or session identity can be recovered: both were computed on the
-- client and only ever reached the server as booleans. Giving each archived row
-- its own pair keeps history countable — one past pageview reads as one visitor
-- with one single-page session, hence the bounce — rather than collapsing every
-- past visit onto a shared sentinel that would report one visitor for all time.
-- The prefix cannot collide with a real visitor_id, a 22-char base64url HMAC,
-- so sessionization can never attach a live visit to an archived one. All three
-- flags are written alongside the ids: leaving is_new_visitor and is_new_session
-- at their old per-row values would leave the same table holding two
-- contradictory answers to "how many sessions is this", and any window covering
-- pre-migration data would report more bounces than sessions.
UPDATE "events" SET
	"browser" = "d"."browser",
	"browser_version" = NULLIF(split_part("d"."browser_version", '.', 1), ''),
	"os" = "d"."os",
	"os_version" = NULLIF(split_part("d"."os_version", '.', 1), ''),
	"device" = "d"."device",
	"locale" = "d"."locale",
	"referrer_host" = "d"."referrer_host",
	"channel" = CASE WHEN "d"."referrer_host" IS NULL THEN 'direct' ELSE 'referral' END,
	"visitor_id" = 'legacy_' || "events"."id",
	"session_id" = 'legacy_' || "events"."id",
	"is_new_visitor" = true,
	"is_new_session" = true,
	"is_a_bounce" = true
FROM (
	SELECT
		"e"."id" AS "id",
		-- value and version are read out of the same metadata row, not maxed
		-- independently, so a browser can never end up wearing another
		-- browser's version number.
		(max(ARRAY["m"."value", "m"."version"]) FILTER (WHERE "m"."type" = 'browser'))[1] AS "browser",
		(max(ARRAY["m"."value", "m"."version"]) FILTER (WHERE "m"."type" = 'browser'))[2] AS "browser_version",
		(max(ARRAY["m"."value", "m"."version"]) FILTER (WHERE "m"."type" = 'os'))[1] AS "os",
		(max(ARRAY["m"."value", "m"."version"]) FILTER (WHERE "m"."type" = 'os'))[2] AS "os_version",
		-- The old column stored ucFirst(ua-parser type), which ranges wider
		-- than the three values the column is documented to hold; anything else
		-- becomes NULL rather than a fourth bucket nothing downstream expects
		-- and the check constraint at the end of this file would reject.
		lower(max("m"."value") FILTER (
			WHERE "m"."type" = 'device' AND lower("m"."value") IN ('desktop', 'mobile', 'tablet')
		)) AS "device",
		max("m"."value") FILTER (WHERE "m"."type" = 'locale') AS "locale",
		NULLIF(
			substring(lower(max("m"."value") FILTER (WHERE "m"."type" = 'referrer')) FROM '^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:www\.)?([^/?#:@]+)'),
			substring(lower("w"."url") FROM '^(?:[a-z][a-z0-9+.-]*://)?(?:[^/?#@]*@)?(?:www\.)?([^/?#:@]+)')
		) AS "referrer_host"
	FROM "events" AS "e"
	JOIN "websites" AS "w" ON "w"."id" = "e"."website_id"
	LEFT JOIN "event_metadata" AS "em" ON "em"."event_id" = "e"."id"
	LEFT JOIN "metadata" AS "m" ON "m"."id" = "em"."metadata_id"
	GROUP BY "e"."id", "w"."url"
) AS "d"
WHERE "d"."id" = "events"."id";--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "visitor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "session_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "channel" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event_metadata" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "metadata" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "event_metadata" CASCADE;--> statement-breakpoint
DROP TABLE "metadata" CASCADE;--> statement-breakpoint
CREATE INDEX "events_website_id_type_created_at_idx" ON "events" USING btree ("website_id","type","created_at");--> statement-breakpoint
CREATE INDEX "events_website_id_visitor_id_created_at_idx" ON "events" USING btree ("website_id","visitor_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "events_website_id_view_token_idx" ON "events" USING btree ("website_id","view_token") WHERE "events"."view_token" IS NOT NULL AND "events"."type" = 'pageview';--> statement-breakpoint
CREATE INDEX "events_website_id_session_id_idx" ON "events" USING btree ("website_id","session_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_type_valid" CHECK ("events"."type" IN ('pageview', 'event'));--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_channel_valid" CHECK ("events"."channel" IN ('direct', 'search', 'social', 'referral', 'campaign'));--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_device_valid" CHECK ("events"."device" IS NULL OR "events"."device" IN ('desktop', 'mobile', 'tablet'));--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_screen_class_valid" CHECK ("events"."screen_class" IS NULL OR "events"."screen_class" IN ('mobile', 'tablet', 'laptop', 'desktop'));
