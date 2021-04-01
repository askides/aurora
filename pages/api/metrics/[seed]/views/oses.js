const { PrismaClient } = require("@prisma/client");

const withAuth = require("../../../../../utils/with-auth");
const percentage = require("../../../../../utils/percentage");

const prisma = new PrismaClient();

const osesViews = async (range, seed) =>
  await prisma.$queryRaw(`
    SELECT
      oses.name as element,
      COUNT(events.id) as views,
      COUNT(DISTINCT events.hash) as unique
    FROM
      events
      JOIN oses ON events.os_id = oses.id
      JOIN websites ON events.website_id = websites.id
    WHERE
      events.created_at >= DATE_TRUNC('${range}', now())
      AND websites.seed = '${seed}'
    GROUP BY
      oses.name
    ORDER BY
      views DESC
  `);

const handleGet = async (req, res) => {
  const { range, seed } = req.query;

  const rows = await osesViews(range, seed)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const totalViews = rows.reduce((acc, el) => acc + el.views, 0);

  const data = rows.map((el) => {
    const perc = percentage(el.views, totalViews);

    return {
      element: el.element,
      views: el.views,
      unique: el.unique,
      percentage: perc,
    };
  });

  return { status: 200, data: data };
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

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handle);
