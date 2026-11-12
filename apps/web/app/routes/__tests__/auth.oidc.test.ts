import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The callback route's own decisions — where each failure lands, that the flow
 * cookie goes on every path, that a connection is held to the account that
 * started it. The protocol and the account policy each have their own suite
 * and are stubbed here.
 */
vi.mock("~/modules/auth/config.server", () => ({
  authConfig: {
    passwordSignup: true,
    oidc: { providerName: "Keycloak", allowedDomains: [] },
  },
}));

vi.mock("~/modules/auth/oidc.server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("~/modules/auth/oidc.server")>();

  return {
    OidcError: actual.OidcError,
    readFlow: vi.fn(),
    completeOidcFlow: vi.fn(),
    beginOidcFlow: vi.fn(),
    clearFlowCookie: vi.fn(async () => "__aurora_oidc=; Max-Age=0"),
  };
});

vi.mock("~/modules/auth/sso.server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("~/modules/auth/sso.server")>();

  return {
    ssoFailureMessage: actual.ssoFailureMessage,
    signInWithIdentity: vi.fn(),
    connectIdentity: vi.fn(),
  };
});

vi.mock("~/modules/auth/queries.server", () => ({
  getUser: vi.fn(),
}));

const { loader: callback } = await import("../auth.oidc.callback");
const { action: start } = await import("../auth.oidc");
const oidc = await import("~/modules/auth/oidc.server");
const sso = await import("~/modules/auth/sso.server");
const { getUser } = await import("~/modules/auth/queries.server");
const { commitSession, getSession } =
  await import("~/modules/auth/session.server");

const flow = {
  state: "st",
  nonce: "no",
  verifier: "ve",
  redirectUri: "https://aurora.example.com/auth/oidc/callback",
  redirectTo: "/websites/abc/analytics",
  intent: "signin" as const,
  userId: null,
};

const profile = {
  issuer: "https://id.example.com",
  subject: "s",
  email: "ada@example.com",
  emailVerified: true,
  firstname: "Ada",
  lastname: "Lovelace",
};

/** A session cookie for `userId`, as the browser would hold it. */
async function sessionFor(userId: string) {
  const session = await getSession();
  session.set("userId", userId);

  return (await commitSession(session)).split(";")[0];
}

async function call(cookie?: string) {
  return (await callback({
    request: new Request(
      "https://aurora.example.com/auth/oidc/callback?code=c&state=st",
      { headers: cookie ? { Cookie: cookie } : {} }
    ),
    params: {},
    context: {},
  } as never)) as Response;
}

/** The message flashed into the session cookie the response sets. */
async function flashed(response: Response) {
  const session = await getSession(
    response.headers
      .getSetCookie()
      .find((line) => line.startsWith("__aurora_session="))
  );

  return session.get("error");
}

const clearsFlow = (response: Response) =>
  response.headers
    .getSetCookie()
    .some((line) => line.startsWith("__aurora_oidc=;"));

beforeEach(() => {
  vi.mocked(oidc.readFlow).mockReset().mockResolvedValue(flow);
  vi.mocked(oidc.completeOidcFlow).mockReset().mockResolvedValue(profile);
  vi.mocked(sso.signInWithIdentity).mockReset();
  vi.mocked(sso.connectIdentity).mockReset();
  vi.mocked(getUser).mockReset().mockResolvedValue(null);
});

describe("GET /auth/oidc/callback", () => {
  it("signs in and goes where the flow was headed", async () => {
    vi.mocked(sso.signInWithIdentity).mockResolvedValue({
      ok: true,
      userId: "u1",
    });

    const response = await call();
    const session = await getSession(
      response.headers
        .getSetCookie()
        .find((line) => line.startsWith("__aurora_session="))
    );

    expect(response.headers.get("Location")).toBe("/websites/abc/analytics");
    expect(session.get("userId")).toBe("u1");
    expect(clearsFlow(response)).toBe(true);
  });

  it("sends an expired attempt back to sign in", async () => {
    vi.mocked(oidc.readFlow).mockResolvedValue(null);

    const response = await call();

    expect(response.headers.get("Location")).toBe("/signin");
    expect(await flashed(response)).toMatch(/expired/);
    expect(oidc.completeOidcFlow).not.toHaveBeenCalled();
  });

  it("shows the policy's refusal on the sign-in page", async () => {
    vi.mocked(sso.signInWithIdentity).mockResolvedValue({
      ok: false,
      failure: "account_exists",
    });

    const response = await call();

    expect(response.headers.get("Location")).toBe("/signin");
    expect(await flashed(response)).toMatch(/already exists/);
    expect(clearsFlow(response)).toBe(true);
  });

  it("shows a provider failure without leaking its detail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(oidc.completeOidcFlow).mockRejectedValue(
      new oidc.OidcError("failed", { cause: new Error("invalid_grant") })
    );

    const response = await call();

    expect(await flashed(response)).toBe(
      "Signing in with Keycloak failed. Please try again."
    );
    expect(clearsFlow(response)).toBe(true);
  });

  describe("intent=link", () => {
    const link = { ...flow, intent: "link" as const, userId: "u1" };

    beforeEach(() => {
      vi.mocked(oidc.readFlow).mockResolvedValue(link);
      vi.mocked(getUser).mockImplementation(
        async (id) => ({ id, password: "hash" }) as never
      );
    });

    it("connects to the account that asked", async () => {
      vi.mocked(sso.connectIdentity).mockResolvedValue({
        ok: true,
        userId: "u1",
      });

      const response = await call(await sessionFor("u1"));

      expect(sso.connectIdentity).toHaveBeenCalledWith(
        expect.anything(),
        "u1",
        profile
      );
      expect(response.headers.get("Location")).toBe("/account");
      expect(clearsFlow(response)).toBe(true);
    });

    /**
     * Signed out, or into someone else, while the provider's page was open:
     * the identity must not land on whoever holds the session now.
     */
    it("refuses when the session is no longer that account's", async () => {
      const response = await call(await sessionFor("u2"));

      expect(sso.connectIdentity).not.toHaveBeenCalled();
      expect(oidc.completeOidcFlow).not.toHaveBeenCalled();
      expect(response.headers.get("Location")).toBe("/account");
    });

    it("refuses with no session at all", async () => {
      const response = await call();

      expect(sso.connectIdentity).not.toHaveBeenCalled();
      expect(response.headers.get("Location")).toBe("/signin");
    });
  });
});

describe("POST /auth/oidc", () => {
  const post = (fields: Record<string, string>, cookie?: string) =>
    start({
      request: new Request("https://aurora.example.com/auth/oidc", {
        method: "POST",
        body: new URLSearchParams(fields),
        headers: cookie ? { Cookie: cookie } : {},
      }),
      params: {},
      context: {},
    } as never);

  beforeEach(() => {
    vi.mocked(oidc.beginOidcFlow)
      .mockReset()
      .mockResolvedValue(new Response(null, { status: 302 }));
  });

  it("keeps only a same-origin redirectTo", async () => {
    await post({ intent: "signin", redirectTo: "//evil.example/x" });

    expect(oidc.beginOidcFlow).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Request),
      {
        intent: "signin",
        userId: null,
        redirectTo: "/",
      }
    );
  });

  it("will not start a connection without a session", async () => {
    await expect(post({ intent: "link" })).rejects.toMatchObject({
      status: 302,
    });
    expect(oidc.beginOidcFlow).not.toHaveBeenCalled();
  });

  it("binds a connection to the signed-in account", async () => {
    vi.mocked(getUser).mockResolvedValue({
      id: "u1",
      password: null,
    } as never);

    await post({ intent: "link" }, await sessionFor("u1"));

    expect(oidc.beginOidcFlow).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Request),
      {
        intent: "link",
        userId: "u1",
        redirectTo: "/account",
      }
    );
  });

  it("says so when the provider cannot be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(oidc.beginOidcFlow).mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await post({ intent: "signin" });

    expect(response.headers.get("Location")).toBe("/signin");
    expect(await flashed(response)).toMatch(/could not be reached/);
  });
});
