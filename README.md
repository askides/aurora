<img src="https://raw.githubusercontent.com/askides/aurora/main/apps/web/public/logo.svg" alt="" height="72" />

# Aurora

Open, cookie-free website analytics you host yourself.

Aurora measures your traffic without storing anything on your visitors' devices
— no cookies, no `localStorage`, no fingerprinting — and keeps every event in a
Postgres database you control. The tracking script is 2.4 KB over the wire.

[![Release](https://img.shields.io/github/v/release/askides/aurora?style=flat-square)](https://github.com/askides/aurora/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#license)

![The Aurora dashboard: pageviews, daily visitors, sessions, bounce rate and
average visit duration over a 30-day range, above a daily pageviews chart and
the top pages and acquisition channels.](.github/assets/dashboard.png)

## Why cookie-free matters

ePrivacy Art. 5(3) governs "storage of information in terminal equipment" — a
`localStorage` key counts just as much as a cookie does. Aurora writes to
neither, so there is no consent banner to show for it.

Visitors are identified by a rotating HMAC derived from the IP address, user
agent and a server-side salt, never by a stored identifier. The hash input
rotates daily, so yesterday's visitor id cannot be linked to today's, and
nothing that leaves the browser can be traced back to a person.

## Quick start with Docker

```bash
docker run -d --name aurora -p 3000:3000 \
  -e DATABASE_URL=postgres://user:password@host:5432/aurora \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  -e AURORA_SALT="$(openssl rand -base64 32)" \
  ghcr.io/askides/aurora:latest
```

Images are published for `linux/amd64` and `linux/arm64`. Use `:latest` or pin a
version (`:4`, `:4.0`, `:4.0.0`); `:edge` tracks `main` and is not stable.

Then open `http://localhost:3000/signup`, create an account, and add a site.

## Configuration

| Variable                | Required             | Description                                                                                   |
| ----------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | yes                  | Postgres connection string, used at runtime and for migrations.                               |
| `SESSION_SECRET`        | yes                  | Signs the session cookie. `openssl rand -base64 32`.                                          |
| `AURORA_SALT`           | yes in production    | HMAC salt for visitor ids. Without it they would be derivable by anyone, so boot fails.       |
| `AURORA_IP_HEADER`      | strongly recommended | The forwarding header your proxy overwrites, e.g. `cf-connecting-ip`.                         |
| `AURORA_COUNTRY_HEADER` | no                   | The header your edge writes the country code into, when it isn't one of the three known ones. |

`AURORA_IP_HEADER` deserves a word. Every forwarding header is client-supplied
until some hop overwrites it, and which hop that is depends on your topology
rather than on anything the request can prove. Left unset in production, Aurora
warns at boot and falls back to guessing among `cf-connecting-ip`, `x-real-ip`
and `x-forwarded-for` — all of which a client can set, which makes visitor,
session and bounce figures forgeable. Name your trusted hop and nothing else is
consulted.

## Adding the tracker to a site

Paste the snippet the dashboard gives you into your page's `<head>`:

```
<script async defer src="https://your-instance/tracker.js" aurora-id="YOUR_SITE_ID"></script>
```

Pageviews, including client-side route changes, are tracked automatically.

For custom events, call the global — it queues calls made before the script has
loaded, so it is safe to use immediately:

```js
aurora("signup");
aurora("purchase", {
  props: { plan: "pro" },
  revenue: { amount: 49.0, currency: "EUR" },
});
```

Props take scalars only, up to 24 keys. Revenue currencies are ISO-4217.

## What the dashboard shows

Visits, unique visitors, sessions, bounce rate and average session duration over
a range you pick, in a timezone you pick, on a Recharts timeseries. Breakdowns
cover pages, referrers, acquisition channels, countries, browsers, operating
systems, devices, languages and the full set of UTM parameters, plus custom
events with their props and revenue.

Any site can be flagged public, which exposes its dashboard read-only at
`/websites/:id/s/analytics` without a login.

## Development

Requires Node 20+ and pnpm 10.

```bash
git clone https://github.com/askides/aurora
cd aurora
pnpm install

docker compose up -d --wait postgres      # dev Postgres on host port 5434
cp apps/web/.env.example apps/web/.env
pnpm db:migrate
pnpm dev
```

The compose Postgres is pinned to a patch release on purpose. Aurora resolves a
window's boundaries in JS and groups the buckets inside it in SQL, so Node's
tzdata and Postgres's have to agree about a zone or the two halves of a chart
disagree by that zone's offset, silently. Both sides assert their own copy
against `AURORA_TZDATA`; move them together or neither.

### Scripts

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `pnpm dev`        | Run the dashboard in development  |
| `pnpm build`      | Build every workspace package     |
| `pnpm test`       | Run the test suites               |
| `pnpm typecheck`  | Typecheck every workspace package |
| `pnpm lint`       | oxlint                            |
| `pnpm format`     | oxfmt                             |
| `pnpm db:migrate` | Apply migrations                  |
| `pnpm db:seed`    | Seed sample data                  |
| `pnpm db:studio`  | Open Drizzle Studio               |

### Layout

pnpm workspace, one deployable app plus the script it serves:

```
apps/
  web       React Router app — dashboard, /collect endpoints, tracker host
packages/
  tracker   Browser tracking script, bundled to apps/web/public/tracker.js
```

`apps/web/app` is organised as feature modules (`analytics`, `auth`, `ingest`,
`websites`) over a `shared` layer. The dependency direction is one-way and
enforced by oxlint: `shared` may not import from `modules` or `shell`.

### Built with

[React Router](https://reactrouter.com/) in framework mode,
[Drizzle](https://orm.drizzle.team/) on PostgreSQL,
[Tailwind CSS](https://tailwindcss.com/) with
[shadcn/ui](https://ui.shadcn.com/), [Recharts](https://recharts.org/),
[Vitest](https://vitest.dev/), and [oxlint/oxfmt](https://oxc.rs/).

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) with
all-lowercase subjects, enforced by a commit-msg hook and again in CI:

```
feat(analytics): add the campaign breakdown panel
fix: reject null props on the collect route
```

Releases are automated.
[release-please](https://github.com/googleapis/release-please) reads those
commits, opens a release pull request, and merging it bumps the version, writes
`CHANGELOG.md`, tags, publishes a GitHub release and pushes the image to GHCR.
Don't edit versions or the changelog by hand.

Versioning follows [SemVer](https://semver.org/). Aurora 4 is a ground-up
rewrite with no migration path from 1.x or 2.x; see
[CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE).
