const { PrismaClient } = require("@prisma/client"); // XXX TODO

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { seed } = req.query;

  // All the pages viewed
  const lastNSecondsVisitors = await prisma.$queryRaw(`
    SELECT
      count(DISTINCT hash) as visitors
    from
      events
      JOIN websites ON events.website_id = websites.id
    where
      events.created_at >= (now() - '30 second' :: interval)
      AND websites.seed = '${seed}'
  `);

  await prisma.$disconnect();

  return res.json({
    data: lastNSecondsVisitors[0], // XXX TODO:
  });
};
