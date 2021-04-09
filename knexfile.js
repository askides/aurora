require("dotenv").config();

module.exports = {
  development: {
    client: "pg",
    connection: process.env.DB_URL,
    migrations: {
      tableName: "knex_migrations",
    },
    pool: {
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 1500,
      createRetryIntervalMillis: 500,
      propagateCreateError: false,
    },
    // debug: true,
    // asyncStackTraces: true,
  },
  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DB_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      tableName: "knex_migrations",
    },
    pool: {
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 1500,
      createRetryIntervalMillis: 500,
      propagateCreateError: false,
    },
    debug: false,
    asyncStackTraces: false,
  },
};
