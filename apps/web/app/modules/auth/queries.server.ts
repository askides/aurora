import { users, type User } from "~/db/schema";
import { eq } from "drizzle-orm";
import { db } from "~/shared/lib/db.server";
import { hash } from "./hash.server";

export function getUsers() {
  return db.select().from(users);
}

/**
 * Annotated `User | null` rather than left to inference. `const [user] = rows`
 * types as `User` without noUncheckedIndexedAccess, so the `?? null` reads as
 * unreachable and callers were handed a type that says a missing row cannot
 * happen — which is what `/signup`'s duplicate check turns on.
 */
export async function getUser(uid: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, uid))
    .limit(1);

  return user ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
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
