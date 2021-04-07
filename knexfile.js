require("dotenv").config();

module.exports = {
  development: {
    client: "pg",
    connection: process.env.DB_URL,
    migrations: {
      tableName: "knex_migrations",
    },
    pool: {
      min: 0, // very important!!!
      max: 10,
      createTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 1000, //since no share, set this to a small number
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: true,
    },
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
      min: 0, // very important!!!
      max: 10,
      createTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 1000, //since no share, set this to a small number
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: true,
    },
  },
};
