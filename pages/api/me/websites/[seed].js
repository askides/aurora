const { PrismaClient } = require("@prisma/client");
const withAuth = require("../../../../utils/with-auth");

const prisma = new PrismaClient();

const handleGet = async (req, res) => {
  const user = req.accessTokenBody.data;
  const { seed } = req.query;

  const ws = await prisma.website.findFirst({
    where: {
      seed: seed,
      owner: {
        email: user.email,
      },
    },
  });

  await prisma.$disconnect();

  return { status: 200, data: ws };
};

const handlePut = (req, res) => ({ status: 405, data: { message: "Method not allowed." } });

const handleDelete = async (req, res) => {
  const user = req.accessTokenBody.data;
  const { seed } = req.query;

  // Delete Website XXX CHECK OWNERSHIP
  await prisma.website.delete({
    where: {
      seed: seed,
    },
  });

  await prisma.$disconnect();

  return { status: 200, data: null };
};

const handler = async (req, res) => {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    case "PUT":
      ({ status, data } = await handlePut(req, res));
      break;
    case "DELETE":
      ({ status, data } = await handleDelete(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handler);
