require("dotenv").config();

module.exports = {
  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DB_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },
};
