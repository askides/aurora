const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      password: "$2a$10$6m.u36XdklkkMYZ01tSPXexVLXMmS.BM1AVcYtOg3fCtsu9EmyqOy", // password
    },
  });

  console.log({ user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
