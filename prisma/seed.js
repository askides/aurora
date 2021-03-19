const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const initialWebsite = await prisma.user.upsert({
    where: { email: "info@renatopozzi.me" },
    update: {},
    create: {
      email: `info@renatopozzi.me`,
      firstname: "Renato",
      lastname: "Pozzi",
      websites: {
        create: {
          url: "https://renatopozzi.me",
        },
      },
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
