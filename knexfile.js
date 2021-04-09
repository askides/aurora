require("dotenv").config();

module.exports = {
  development: {
    client: "pg",
    connection: process.env.DB_URL,
    migrations: {
      tableName: "knex_migrations",
    },
    pool: { min: 1, max: 1 },
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
    pool: { min: 1, max: 1 },
    debug: false,
    asyncStackTraces: false,
  },
};
