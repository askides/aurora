import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const user = await prisma.user.create({
    data: {
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      // bcrypt hash of "password"
      password: "$2a$10$6m.u36XdklkkMYZ01tSPXexVLXMmS.BM1AVcYtOg3fCtsu9EmyqOy",
    },
  });

  console.log({ user });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
