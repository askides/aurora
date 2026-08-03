import { users } from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { casing: "snake_case" });

async function main() {
  const [user] = await db
    .insert(users)
    .values({
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      // bcrypt hash of "password"
      password: "$2a$10$6m.u36XdklkkMYZ01tSPXexVLXMmS.BM1AVcYtOg3fCtsu9EmyqOy",
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  console.log(user ?? "user already present, nothing to seed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
