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

  const pool = new Pool({ connectionString });

  // pg emits 'error' on the pool when an *idle* client fails — a database
  // restart, a failover, an idle_session_timeout, a pooler dropping the TCP
  // connection. Node throws on an 'error' event with no listener, which would
  // take the whole server down rather than the one dead connection. The Prisma
  // adapter this replaced installed such a handler; without it the port would
  // have been a regression.
  pool.on("error", (error) => {
    console.error("[db] idle client error", error);
  });

  return pool;
}

const pool = globalForDb.pool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema, casing: "snake_case" });

export { schema };
