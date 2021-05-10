require("dotenv").config();

module.exports = {
  test: {
    client: "pg",
    connection: {
      connectionString: process.env.DB_URL,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      // ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
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
  },
  development: {
    client: "pg",
    connection: {
      connectionString: process.env.DB_URL,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      // ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
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
  },
  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DB_URL,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      //ssl: { rejectUnauthorized: process.env.DB_SSL ? false : true },
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
  },
};
