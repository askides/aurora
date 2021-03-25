const { PrismaClient } = require("@prisma/client");
const generateSeed = require("../../../../utils/generate-seed");
const withAuth = require("../../../../utils/with-auth");

const prisma = new PrismaClient();

const handleGet = async (req, res) => {
  const user = req.accessTokenBody.data;

  const websites = await prisma.website.findMany({
    where: {
      owner: {
        email: user.email,
      },
    },
  });

  await prisma.$disconnect();

  return { status: 200, data: websites };
};

const handlePost = async (req, res) => {
  const user = req.accessTokenBody.data;

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

  return { status: 200, data: createdWebsite };
};

const handler = async (req, res) => {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    case "POST":
      ({ status, data } = await handlePost(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handler);
