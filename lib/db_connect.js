const knex = require("knex");

const environment = process.env.NODE_ENV || "production";
const config = require("../knexfile.js")[environment];

const db = knex(config);

module.exports = db;
