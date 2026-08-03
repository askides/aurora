// session.server throws at import time without these.
process.env.SESSION_SECRET ??= "test-secret";
process.env.DATABASE_URL ??= "postgres://root:password@localhost:5432/aurora";
