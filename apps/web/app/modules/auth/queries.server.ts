import { users } from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "~/shared/lib/db.server";
import { hash } from "./hash.server";

export function getUsers() {
  return db.select().from(users);
}

export async function getUser(uid: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, uid))
    .limit(1);

  return user ?? null;
}

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function countUsers() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  return row?.count ?? 0;
}

export async function createUser(data: {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}) {
  const [user] = await db
    .insert(users)
    .values({ ...data, password: hash(data.password)! })
    .returning();

  return user;
}

export async function updateUser(
  uid: string,
  data: Partial<{
    firstname: string;
    lastname: string;
    email: string;
    password: string;
  }>
) {
  const { password, ...rest } = data;

  const [user] = await db
    .update(users)
    .set({ ...rest, ...(password && { password: hash(password)! }) })
    .where(eq(users.id, uid))
    .returning();

  return user;
}

export async function deleteUser(uid: string) {
  const [user] = await db.delete(users).where(eq(users.id, uid)).returning();

  return user;
}
