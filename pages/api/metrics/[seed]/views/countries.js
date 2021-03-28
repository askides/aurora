const { PrismaClient } = require("@prisma/client");
const locale = require("locale-codes");
const percentage = require("../../../../../utils/percentage");

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { range, seed } = req.query;

  //  AND events.created_at >= (now() - '1 ${range}'::interval)
  const rows = await prisma.$queryRaw(`
    SELECT
      locale as element,
      count(element) as views,
      COUNT(DISTINCT events.hash) as unique
    FROM
      events
      JOIN websites ON events.website_id = websites.id
    WHERE
      websites.seed = '${seed}'

    GROUP BY
      locale
    ORDER BY
      views DESC
  `);

  await prisma.$disconnect();

  const totalViews = rows.reduce((acc, el) => acc + el.views, 0);

  const data = rows.map((el) => {
    const perc = percentage(el.views, totalViews);
    const location = locale.getByTag(el.element).location;

    return {
      element: location,
      views: el.views,
      unique: el.unique,
      percentage: perc,
    };
  });

  return res.json({ data: data });
};
