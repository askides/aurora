const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  return await prisma.user.findMany();
}

module.exports = async (req, res) => {
  //   await prisma.user.create({
  //     data: {
  //       name: "Alice",
  //       email: "alice@prisma.io",
  //       posts: {
  //         create: { title: "Hello World" },
  //       },
  //       profile: {
  //         create: { bio: "I like turtles" },
  //       },
  //     },
  //   });

  const allUsers = await main()
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  console.log(allUsers);

  res.json({ body: allUsers });
};
