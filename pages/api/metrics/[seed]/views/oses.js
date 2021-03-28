const { PrismaClient } = require("@prisma/client");
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
    WHERE events.created_at >= (now() - '1 ${range}'::interval)
    AND websites.seed = '${seed}'
    GROUP BY
      oses.name
    ORDER BY views DESC
  `);

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { range, seed } = req.query;

  const r = range.replace("this_", ""); /// XXX TO CHECK VALUES

  const rows = await osesViews(r, seed)
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

  return res.json({ data: data });
};
