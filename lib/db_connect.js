const knex = require("knex");

const environment = process.env.NODE_ENV || "production";
const config = require("../knexfile.js")[environment];

const db = knex(config);
const bookshelf = require("bookshelf")(db);

// this is a tarn.js pool. Look at tarn.js on github for documentation/source code.
const pool = db.client.pool;

// ensure that connections are immediately eligible for destruction once they are freed. Note that we can't pass
// in a number <= 0 via the config because tarn will throw an error, but we can freely access this member and
// override it.
pool.idleTimeoutMillis = -1;

// this is the event that the pool will fire once a connection has been used and is being returned to the pool.
// note that knex will not release transactions back to the pool until the transaction has been committed or rolled
// back.
pool.on("release", () => {
  // We need to use nextTick since the release event will fire before the tarn resource is moved back into the array
  // of free resources.
  process.nextTick(() => {
    // Manually trigger a 'check' call, which will go through each of the free resources and destroy them if
    // they have been idle for longer than idleTimeoutMillis. This will always be true, so released resources
    // that were not used immediately will be destroyed.
    pool.check();
  });
});

module.exports = { db, bookshelf };
