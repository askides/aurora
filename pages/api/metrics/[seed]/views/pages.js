const { PrismaClient } = require("@prisma/client");
const percentage = require("../../../../../utils/percentage");

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { seed } = req.query;

  const rows = await prisma.$queryRaw(`
    SELECT
      element,
      count(element) as views,
      COUNT(DISTINCT events.hash) as unique
    FROM
      events
      JOIN websites ON events.website_id = websites.id
    WHERE
      websites.seed = '${seed}'
    GROUP BY
      element
    ORDER BY
      views DESC
  `);

  await prisma.$disconnect();

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
