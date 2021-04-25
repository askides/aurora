const { withSharedAuth } = require("../../../../../utils/hof/withSharedAuth");
const { db } = require("../../../../../lib/db_connect");

const handleGet = async (req, res) => {
  const { seed } = req.query;

  const rows = await db("events")
    .countDistinct("events.hash as visitors")
    .join("websites", "events.website_id", "websites.id")
    .whereRaw(`events.created_at >= (now() - '30 second' :: interval)`)
    .where("events.type", "pageView")
    .where("websites.seed", seed);

  const lastNSecondsVisitors = await rows.reduce((acc, el) => el, {});

  return { status: 200, data: lastNSecondsVisitors };
};

const handle = async function (req, res) {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data });
};

module.exports = withSharedAuth(handle);
