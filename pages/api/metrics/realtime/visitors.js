const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  // All the pages viewed
  const lastNSecondsVisitors = await prisma.$queryRaw`
    SELECT count(DISTINCT hash) as visitors from events
    where created_at >= (now() - '30 second'::interval)
  `;

  await prisma.$disconnect();

  return res.json({
    data: lastNSecondsVisitors[0], // XXX TODO:
  });
};
