const environment = process.env.ENVIRONMENT || "development";
const config = require("../knexfile.js")[environment];

const pg = require("knex")(config);

module.exports = pg;
