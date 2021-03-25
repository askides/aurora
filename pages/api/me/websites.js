const { PrismaClient } = require("@prisma/client");
const { default: withAuth } = require("../../../utils/withAuth");

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

    // Create Event
    const createdWebsite = await prisma.website.create({
      data: {
        url: url,
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
