const { PrismaClient } = require("@prisma/client");
const generateSeed = require("../../../utils/generate-seed");
const withAuth = require("../../../utils/with-auth");

const prisma = new PrismaClient();

const handler = async (req, res) => {
  const user = req.accessTokenBody.data;

  if (req.method === "GET") {
    const websites = await prisma.website.findMany({
      where: {
        owner: {
          email: user.email,
        },
      },
    });

    await prisma.$disconnect();

    return res.json({ data: websites });
  } else if (req.method === "POST") {
    const { url } = req.body;
    const seed = generateSeed();

    // Create Event
    const createdWebsite = await prisma.website.create({
      data: {
        url: url,
        seed: seed,
        owner: {
          connect: {
            email: user.email,
          },
        },
      },
    });

    return res.status(200).json({ data: createdWebsite });
  } else {
    return res.status(405).json({ message: "Method not allowed." });
  }
};

module.exports = withAuth(handler);
