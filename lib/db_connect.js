const environment = process.env.NODE_ENV || "production";
const config = require("../knexfile.js")[environment];

const db = require("knex")(config);

module.exports = db;
