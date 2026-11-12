import { createCookieSessionStorage, redirect } from "react-router";
import { authConfig } from "./config.server";
import { getUser } from "./queries.server";

/** How a session was started, which decides what signing out has to undo. */
export type SignInMethod = "password" | "sso";

type SessionData = {
  userId: string;
  /** Absent on sessions from before SSO existed, which were all passwords. */
  method: SignInMethod;
};
type SessionFlashData = { error: string };

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is not set");
}

/** Shared with the short-lived cookie the OIDC flow keeps its checks in. */
export const cookieSecrets = [sessionSecret];

export const sessionStorage = createCookieSessionStorage<
  SessionData,
  SessionFlashData
>({
  cookie: {
    name: "__aurora_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: cookieSecrets,
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
  /** False for an account created through SSO that never set a password. */
  has_password: boolean;
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

  // Turning password sign-in off has to end the password sessions already out
  // there, or it only takes effect as they expire — up to 30 days later, which
  // is a long time for an MFA requirement to be optional.
  if (!authConfig.passwordLogin && session.get("method") !== "sso") {
    return null;
  }

  const user = await getUser(userId);

  if (!user) {
    return null;
  }

  const { password, ...safeUser } = user;

  return { ...safeUser, has_password: password !== null };
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

/**
 * Where a `redirectTo` from the request may send the browser: a path on this
 * origin, or "/". A leading slash alone is not enough — `//evil.example` and
 * `/\evil.example` are both read by browsers as a host on another origin.
 */
export function safeRedirect(to: FormDataEntryValue | null) {
  if (typeof to !== "string" || !to.startsWith("/")) {
    return "/";
  }

  if (to.startsWith("//") || to.startsWith("/\\")) {
    return "/";
  }

  return to;
}

/**
 * Redirects with a one-time message for the next page to show. The message
 * travels in the session cookie, so it is neither echoed from the URL nor left
 * behind in the address bar to reappear on reload.
 */
export async function redirectWithError(
  request: Request,
  to: string,
  error: string
) {
  const session = await getSession(request.headers.get("Cookie"));
  session.flash("error", error);

  return redirect(to, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

/**
 * Reads and clears the flashed message. The `Set-Cookie` has to go out with the
 * response, or the message is shown again on the next request.
 */
export async function consumeFlashError(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  const error = session.get("error") ?? null;

  return {
    error,
    headers: error
      ? { "Set-Cookie": await commitSession(session) }
      : ({} as Record<string, string>),
  };
}

export async function createUserSession(
  userId: string,
  redirectTo: string,
  method: SignInMethod
) {
  const session = await getSession();
  session.set("userId", userId);
  session.set("method", method);

  return redirect(redirectTo, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export async function getSignInMethod(
  request: Request
): Promise<SignInMethod | null> {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.get("userId")) {
    return null;
  }

  return session.get("method") ?? "password";
}

export async function signout(request: Request, to = "/signin") {
  const session = await getSession(request.headers.get("Cookie"));

  return redirect(to, {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
