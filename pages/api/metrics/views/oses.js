const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const osesViews = async () =>
  await prisma.$queryRaw`
    SELECT
      oses.name as element,
      COUNT(events.id) as views
    FROM
      events
      JOIN oses ON events.os_id = oses.id
    GROUP BY
      oses.name
    ORDER BY views DESC
  `;

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { range } = req.query;

  const data = await osesViews()
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const x = data.map((dv) => [dv.element, dv.views]);

  return res.json({
    data: x,
  });
};
