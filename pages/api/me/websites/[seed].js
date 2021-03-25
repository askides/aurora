const { PrismaClient } = require("@prisma/client");
const withAuth = require("../../../../utils/with-auth");

const prisma = new PrismaClient();

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

  return res.status(200).json({ message: "Record deleted." });
};

const handler = async (req, res) => {
  let { status, data } = {};

  switch (req.method) {
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
