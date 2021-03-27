const { PrismaClient } = require("@prisma/client");
const withAuth = require("../../../utils/with-auth");
const { hash } = require("../../../utils/hash");

const prisma = new PrismaClient();

const handleGet = (req, res) => ({ status: 200, data: req.accessTokenBody.data });

const handlePut = async (req, res) => {
  const user = req.accessTokenBody.data;
  const { password } = req.body;

  await prisma.user.update({
    where: {
      email: user.email,
    },
    data: {
      password: hash(password),
    },
  });

  await prisma.$disconnect();

  return { status: 200, data: { message: "User info updated." } };
};

const handle = async function (req, res) {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    case "PUT":
      ({ status, data } = await handlePut(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handle);
