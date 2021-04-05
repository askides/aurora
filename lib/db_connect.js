const environment = process.env.ENVIRONMENT || "production";
const config = require("../knexfile.js")[environment];

const db = require("knex")(config);

module.exports = db;
