const db = require("../../lib/db_connect");
const { withAuth } = require("./withAuth");

const withSharedAuth = (fn) => async (req, res) => {
  // Need to check if website is shared.
  const { seed } = req.query;

  const website = await db("websites").where("websites.seed", seed).first();

  if (website.shared) {
    return fn(req, res);
  }

  return withAuth(fn)(req, res);
};

module.exports = { withSharedAuth };
