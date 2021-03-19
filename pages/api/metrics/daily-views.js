const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { type, element } = req.body;

  const dailyViews = await prisma.$queryRaw`
    SELECT range,
      COALESCE(e.views, 0) AS views
    FROM   Generate_series(0, 23) AS range
      LEFT JOIN (SELECT Date_part('hour', "createdAt") AS hour,
                        Count(id)                      AS views
                FROM   "Event"
                GROUP  BY hour) AS e
            ON range = e.hour
    ORDER  BY range
  `;

  return res.json({
    data: dailyViews,
  });
};
