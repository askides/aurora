import { userIdentities, users, type User } from "~/db/schema";
import { and, eq, sql } from "drizzle-orm";
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

/** An OpenID Connect identity, as the provider names it. */
export type IdentityKey = { issuer: string; subject: string };

export async function getUserByIdentity({
  issuer,
  subject,
}: IdentityKey): Promise<User | null> {
  const [row] = await db
    .select({ user: users })
    .from(userIdentities)
    .innerJoin(users, eq(users.id, userIdentities.user_id))
    .where(
      and(
        eq(userIdentities.issuer, issuer),
        eq(userIdentities.subject, subject)
      )
    )
    .limit(1);

  return row?.user ?? null;
}

/** The identity a user has connected, if any. There is at most one. */
export async function getUserIdentity(uid: string) {
  const [identity] = await db
    .select()
    .from(userIdentities)
    .where(eq(userIdentities.user_id, uid))
    .limit(1);

  return identity ?? null;
}

/**
 * The account and the identity that will sign into it, in one transaction: a
 * user row without its identity would be an account nobody can reach, holding
 * the email address so that the next attempt fails too.
 */
export async function createUserWithIdentity(
  data: { firstname: string; lastname: string; email: string },
  identity: IdentityKey
) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ ...data, password: null })
      .returning();

    await tx.insert(userIdentities).values({ ...identity, user_id: user.id });

    return user;
  });
}

export async function linkIdentity(uid: string, identity: IdentityKey) {
  await db.insert(userIdentities).values({ ...identity, user_id: uid });
}

/**
 * Detaches the user's identity, but only while the account has a
 * password to sign in with instead — an SSO-only account that dropped its one
 * identity would be locked out for good. The guard is part of the statement so
 * no caller can forget it. Resolves to whether a row went.
 */
export async function unlinkIdentity(uid: string) {
  const removed = await db
    .delete(userIdentities)
    .where(
      and(
        eq(userIdentities.user_id, uid),
        sql`exists (select 1 from ${users} where ${users.id} = ${uid} and ${users.password} is not null)`
      )
    )
    .returning({ id: userIdentities.id });

  return removed.length > 0;
}
