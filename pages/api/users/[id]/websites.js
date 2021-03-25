const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const websites = await prisma.website.findMany();

  await prisma.$disconnect();

  return res.json({
    data: websites, // XXX TODO:
  });
};
