const environment = process.env.ENVIRONMENT || "production";
const config = require("../knexfile.js")[environment];

const pg = require("knex")(config);

module.exports = pg;
