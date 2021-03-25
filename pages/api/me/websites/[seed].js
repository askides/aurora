const { PrismaClient } = require("@prisma/client");
const withAuth = require("../../../../utils/with-auth");

const prisma = new PrismaClient();

const handler = async (req, res) => {
  const user = req.accessTokenBody.data;

  if (req.method === "PUT") {
    // THINKING: Need to think if is correct...
    return res.status(405).json({ message: "Method not allowed." });
  } else if (req.method === "DELETE") {
    const { seed } = req.query;

    // Delete Website XXX CHECK OWNERSHIP
    await prisma.website.delete({
      where: {
        seed: seed,
      },
    });

    return res.status(200).json({ message: "Record deleted." });
  } else {
    return res.status(405).json({ message: "Method not allowed." });
  }
};

module.exports = withAuth(handler);
