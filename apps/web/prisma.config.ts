import { existsSync } from "node:fs";
import { defineConfig } from "@prisma/config";

// Prisma 7 no longer loads .env implicitly; the CLI needs DATABASE_URL present.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Only migrate/studio/seed open a connection. `prisma generate` runs during
    // the Docker build and in CI before any database exists, so a missing URL
    // falls back instead of throwing — the commands that need it still fail
    // loudly when they try to connect.
    url: process.env.DATABASE_URL ?? "postgresql://unset",
  },
});
