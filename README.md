<img src="https://raw.githubusercontent.com/itsrennyman/aurora/main/apps/web/public/aurora_mini_blue.svg" alt="Aurora Logo" height="100" />

<hr />

![Stars](https://img.shields.io/github/stars/itsrennyman/aurora?style=for-the-badge)
![Latest Release](https://img.shields.io/github/v/release/itsrennyman/aurora?style=for-the-badge)

# About Aurora 🌈

Hate Cookies? Introducing Aurora, 100% Cookie-Free Open Website Analytics.
Collect Anonymous Data. Make your Audience Happy Now!

### Getting Started 🤩

```bash
git clone https://github.com/itsrennyman/aurora
cd aurora
pnpm install

cp apps/web/.env.example apps/web/.env   # set DATABASE_URL and SESSION_SECRET
pnpm db:migrate
pnpm dev
```

Then open `/setup` to create the first user. Full instructions live in the
[docs](apps/docs).

### Repository Layout 📦

pnpm workspace, one deployable app plus its docs:

```
apps/
  web     React Router app — dashboard, /collect endpoint and tracker script
  docs    Nextra documentation site
packages/
  tracker Browser tracking script, bundled into apps/web/public/tracker.js
```

### Built With 🏗️

- [React Router](https://reactrouter.com/) (framework mode)
- [Tailwind CSS](https://tailwindcss.com/) and
  [shadcn/ui](https://ui.shadcn.com/)
- [Prisma](https://www.prisma.io/) and PostgreSQL

### Scripts 🛠️

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `pnpm dev`        | Run the dashboard in development  |
| `pnpm dev:docs`   | Run the documentation site        |
| `pnpm build`      | Build every workspace package     |
| `pnpm test`       | Run the test suites               |
| `pnpm typecheck`  | Typecheck every workspace package |
| `pnpm db:migrate` | Apply database migrations         |

### Versioning 🚦

We use [SemVer](http://semver.org/) for versioning. For the versions available,
see the [tags on this repository](https://github.com/itsrennyman/aurora/tags).

### Authors 🙋

- [Renato Pozzi](https://github.com/itsrennyman)

### Stargazers 🌟

[![Stargazers repo roster for @itsrennyman/aurora](https://reporoster.com/stars/itsrennyman/aurora)](https://github.com/itsrennyman/aurora/stargazers)

See also the list of
[contributors](https://github.com/itsrennyman/aurora/contributors) who
participated in this project.

### License

This project is licensed under the MIT License - see the
[LICENSE.md](LICENSE.md) file for details
