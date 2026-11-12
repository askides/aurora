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

| Variable                         | Required             | Description                                                                                      |
| -------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                   | yes                  | Postgres connection string, used at runtime and for migrations.                                  |
| `SESSION_SECRET`                 | yes                  | Signs the session cookie. `openssl rand -base64 32`.                                             |
| `AURORA_SALT`                    | yes in production    | HMAC salt for visitor ids. Without it they would be derivable by anyone, so boot fails.          |
| `AURORA_IP_HEADER`               | strongly recommended | The forwarding header your proxy overwrites, e.g. `cf-connecting-ip`.                            |
| `AURORA_COUNTRY_HEADER`          | no                   | The header your edge writes the country code into, when it isn't one of the three known ones.    |
| `AURORA_DISABLE_PASSWORD_SIGNUP` | no                   | `true` closes `/signup`. Existing accounts keep their passwords; new ones come only through SSO. |
| `AURORA_DISABLE_PASSWORD_LOGIN`  | no                   | `true` makes SSO the only way in and ends existing password sessions. Requires `OIDC_ISSUER`.    |

`AURORA_IP_HEADER` deserves a word. Every forwarding header is client-supplied
until some hop overwrites it, and which hop that is depends on your topology
rather than on anything the request can prove. Left unset in production, Aurora
warns at boot and falls back to guessing among `cf-connecting-ip`, `x-real-ip`
and `x-forwarded-for` — all of which a client can set, which makes visitor,
session and bounce figures forgeable. Name your trusted hop and nothing else is
consulted.

Single sign-on has variables of its own, under
[Single sign-on](#single-sign-on).

## Single sign-on

Aurora can sign people in through any OpenID Connect provider — Keycloak,
Authentik, Authelia, Zitadel, Okta, Entra ID, Google and so on. Register Aurora
as a confidential web client using the authorization code flow, with
`https://your-instance/auth/oidc/callback` as its redirect URI, then set:

| Variable                  | Required | Description                                                                                                                                                            |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OIDC_ISSUER`             | yes      | The issuer URL, e.g. `https://id.example.com/realms/acme`. Setting it turns SSO on.                                                                                    |
| `OIDC_CLIENT_ID`          | yes      | The client id registered at the provider.                                                                                                                              |
| `OIDC_CLIENT_SECRET`      | no       | The client secret. Leave it out for a public client, which then relies on PKCE alone.                                                                                  |
| `OIDC_REDIRECT_URI`       | yes      | `https://your-instance/auth/oidc/callback`, exactly as registered at the provider. Served on several domains? List one per domain, comma-separated, and register each. |
| `OIDC_PROVIDER_NAME`      | no       | The name on the button, "Continue with …". Defaults to `SSO`.                                                                                                          |
| `OIDC_SCOPES`             | no       | Defaults to `openid email profile`.                                                                                                                                    |
| `OIDC_ALLOWED_DOMAINS`    | no       | Comma-separated email domains allowed to sign in. Only addresses the provider has verified count.                                                                      |
| `OIDC_CLIENT_AUTH_METHOD` | no       | `client_secret_basic` (default) or `client_secret_post`, matching the provider's client setting.                                                                       |
| `OIDC_PROVIDER_LOGOUT`    | no       | `false` keeps signing out of Aurora from also signing out at the provider. Defaults to `true`.                                                                         |

A sign-in button appears on `/signin` and `/signup`. A sign-in returns to the
page that asked for it, on the domain it started from. Someone signing in for
the first time gets a new account with no password. An existing account is never
matched to an SSO identity by email. Aurora doesn't verify the addresses
`/signup` accepts, so the account holding an address may not belong to the
person who owns it. If someone signs in through SSO with an address that is
already registered, the sign-in is refused. To use SSO with an existing account,
sign in with its password and connect the provider from the account page.

Who may sign in is up to the provider: assign the Aurora client only to the
people who should have it. With a provider anyone can sign up at, such as
Google, set `OIDC_ALLOWED_DOMAINS`. Entra ID doesn't send `email_verified`, so
the allowlist rejects everyone there. Restrict access through a single-tenant
issuer and app assignment instead.

### Signing out

Signing out of a session that started through SSO also ends the session at the
provider. That signs the user out of every app using it, which is what you want
on a shared machine. Set `OIDC_PROVIDER_LOGOUT=false` to sign out of Aurora
only. Sessions started with a password are never sent to the provider.

After signing out, the provider sends the browser back to the callback URI,
which forwards it to `/signin`. Keycloak, Authentik and Entra ID accept a
registered redirect URI as the post-logout target, so they need no extra setup.
Okta keeps a separate list of sign-out redirect URIs; add the callback URI
there.

### SSO only

`AURORA_DISABLE_PASSWORD_LOGIN=true` removes password sign-in, so the provider's
policies, such as MFA, can't be bypassed with a local password. It also closes
`/signup`. Sessions started with a password end at once instead of running to
their 30-day expiry. SSO-only users can't set or remove a password.

Have users connect SSO from the account page before you turn this on. An account
without a connected identity has no way in afterwards, and SSO won't take it
over by email (see above). To let such a user connect, turn password sign-in
back on for as long as it takes.

### Rate limits

Password attempts are throttled per client and per account. The client is the
address `AURORA_IP_HEADER` names, so set it. Both steps of an SSO round trip
count against the client's limit. A throttled account can sign in again after a
few seconds, whether or not the password was right.

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
