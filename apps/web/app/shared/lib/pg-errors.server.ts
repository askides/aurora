/**
 * Postgres error shapes, kept apart from db.server so that reading one costs
 * nothing: importing db.server constructs the connection pool, and a suite that
 * stubs the pool would otherwise have to stub this too — mocking away the logic
 * it came to test.
 */

/**
 * pg reports a unique violation as 23505, and drizzle wraps it in a
 * DrizzleQueryError, so the code is one `cause` down — two once a transaction
 * has rethrown it.
 *
 * Every caller is a place where a check-then-insert has a race in it: two
 * requests can both read "no such row" before either writes, and the constraint
 * is the only thing that sees the second one. The catch is the answer, the
 * check is only there for the better message.
 */
export function isUniqueViolation(error: unknown): boolean {
  for (let cause = error, depth = 0; depth < 4; depth += 1) {
    if (typeof cause !== "object" || cause === null) {
      return false;
    }

    if ((cause as { code?: unknown }).code === "23505") {
      return true;
    }

    cause = (cause as { cause?: unknown }).cause;
  }

  return false;
}
