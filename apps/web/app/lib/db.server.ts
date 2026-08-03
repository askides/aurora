import * as schema from "~/db/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Cached on globalThis so `react-router dev` HMR doesn't open a new pool on
 * every reload.
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Pool({ connectionString });
}

const pool = globalForDb.pool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema, casing: "snake_case" });

export { schema };
