import { createCookieSessionStorage, redirect } from "react-router";
import { getUser } from "./queries.server";

type SessionData = { userId: string };
type SessionFlashData = { error: string };

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is not set");
}

export const sessionStorage = createCookieSessionStorage<
  SessionData,
  SessionFlashData
>({
  cookie: {
    name: "__aurora_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

export type SessionUser = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  created_at: Date;
  updated_at: Date;
};

/** Resolves the signed-in user, or null. Never throws. */
export async function getCurrentUser(
  request: Request
): Promise<SessionUser | null> {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) {
    return null;
  }

  const user = await getUser(userId);

  if (!user) {
    return null;
  }

  const { password: _password, ...safeUser } = user;

  return safeUser;
}

/** Resolves the signed-in user or redirects to /signin, preserving the target. */
export async function requireUser(request: Request): Promise<SessionUser> {
  const user = await getCurrentUser(request);

  if (!user) {
    const url = new URL(request.url);
    const params = new URLSearchParams({
      redirectTo: url.pathname + url.search,
    });

    throw redirect(`/signin?${params}`);
  }

  return user;
}

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await getSession();
  session.set("userId", userId);

  return redirect(redirectTo, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));

  return redirect("/signin", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
