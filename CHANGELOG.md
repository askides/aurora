# Changelog

## [4.0.0](https://github.com/askides/aurora/compare/v2.0.1...v4.0.0) (2026-08-05)

A ground-up rewrite. Nothing is carried over from the 2.x Next.js application —
the stack, the database schema, the tracker, and the dashboard are all new, and
there is no migration path from a 2.x installation.

There is no 3.x: the number was skipped so the rewrite starts on a clean major.

### ⚠ BREAKING CHANGES

- The event schema is denormalised into a single wide table. A 2.x database
  cannot be upgraded in place.
- Prisma is replaced by Drizzle; `prisma migrate` is replaced by
  `pnpm db:migrate` (drizzle-kit).
- The tracker's wire format changed. Re-copy the snippet from the dashboard —
  a 2.x `tracker.js` will not report to a 3.x collector.

### Features

- Rewritten storage-free tracker in TypeScript: no cookies, no `localStorage`.
- Visitor and session ids derived from a rotating HMAC rather than stored
  identifiers.
- Ingest rebuilt around sessionization and a duration token, with referrers
  classified into acquisition channels at write time.
- Country resolved from edge headers only; client parsed from UA hints first,
  falling back to the UA string.
- Rate limiting on the unauthenticated collect endpoints, and CORS that echoes
  the caller's origin instead of allowing `*`.
- Dashboard rebuilt around range and timezone pickers, a Recharts timeseries,
  tabbed breakdown panels, and a sidebar shell on an aurora palette.
- Website list with per-site numbers and a sheet for adding sites.

### Refactoring

- Migrated to React Router v8 on a pnpm workspace with Tailwind and shadcn.
- Reorganised the app into feature modules over a shared layer, with the
  shared-to-modules direction enforced by oxlint.
- Replaced Prisma with Drizzle and fixed the schema defects that surfaced.
- Query layer rebuilt on the wide events table; preset windows measured in
  milliseconds rather than calendar days.
- Replaced prettier with oxfmt + oxlint.

### Bug Fixes

- Pinned both tzdata copies — the Node base image and the Postgres image — and
  assert them at build time, so the JS and SQL halves of a chart cannot disagree
  about a zone's offset.
- Substituted the legacy timezone names Postgres rejects.
