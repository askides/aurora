const { withSharedAuth } = require("../../../../../utils/hof/withSharedAuth");
const { percentage } = require("../../../../../utils/math");
const { db } = require("../../../../../lib/db_connect");

const handleGet = async (req, res) => {
  const { range, seed } = req.query;

  const rows = await db("events")
    .select("browsers.name as element")
    .count("events.id as views")
    .countDistinct("events.hash as unique")
    .join("browsers", "events.browser_id", "browsers.id")
    .join("websites", "events.website_id", "websites.id")
    .whereRaw(`events.created_at >= DATE_TRUNC('${range}', now())`)
    .where("events.type", "pageView")
    .where("websites.seed", seed)
    .groupBy("browsers.name")
    .orderBy("views", "desc");

  const totalViews = rows.reduce((acc, el) => acc + Number(el.views), 0);

  const data = rows.map((el) => {
    const perc = percentage(el.views, totalViews);

    return {
      element: el.element,
      views: Number(el.views),
      unique: Number(el.unique),
      percentage: perc,
    };
  });

  return { status: 200, data };
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
