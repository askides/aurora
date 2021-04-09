const db = require("../../../lib/db_connect");
const { withSharedAuth } = require("../../../utils/hof/withSharedAuth");

const handleGet = async (req, res) => {
  const { seed } = req.query;

  const website = await db("websites").where("websites.seed", seed).first();

  return {
    status: 200,
    data: {
      name: website.name,
      url: website.url,
      seed: website.seed,
    },
  };
};

const handler = async (req, res) => {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withSharedAuth(handler);
