import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OidcSettings } from "../config.server";

/**
 * openid-client is the seam: everything it does on the wire is its own suite's
 * business. What is Aurora's is what goes in — the URL the code is redeemed
 * against, the checks it is held to — and what comes out of the claims.
 */
vi.mock("openid-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openid-client")>();

  return {
    ...actual,
    discovery: vi.fn(),
    authorizationCodeGrant: vi.fn(),
    fetchUserInfo: vi.fn(),
    buildAuthorizationUrl: vi.fn(
      (_config: unknown, params: Record<string, string>) =>
        new URL(`https://id.example.com/auth?${new URLSearchParams(params)}`)
    ),
  };
});

const client = await import("openid-client");

const settings: OidcSettings = {
  issuer: new URL("https://id.example.com/realms/aurora"),
  clientId: "aurora",
  clientSecret: "s3cret",
  clientAuthMethod: "client_secret_basic",
  redirectUris: [
    new URL("https://aurora.example.com/auth/oidc/callback"),
    new URL("https://aurora.example.de/auth/oidc/callback"),
  ],
  providerName: "Keycloak",
  scope: "openid email profile",
  allowedDomains: [],
};

const fakeConfig = (userinfo_endpoint?: string) => ({
  serverMetadata: () => ({ userinfo_endpoint }),
});

const claims = {
  iss: "https://id.example.com/realms/aurora",
  sub: "f81d4fae",
  aud: "aurora",
  iat: 0,
  exp: 0,
  email: "Ada@Example.com",
  email_verified: true,
  given_name: "Ada",
  family_name: "Lovelace",
};

const tokens = (idClaims: Record<string, unknown> = claims) => ({
  access_token: "at",
  token_type: "bearer",
  claims: () => idClaims,
});

/**
 * Fresh per test: the module caches discovery for the life of the process, and
 * the retry-after-failure case needs to see the first fetch.
 */
async function load() {
  vi.resetModules();

  return import("../oidc.server");
}

/** The cookie a real `beginOidcFlow` planted, as the browser would send it. */
async function startFlow(
  oidc: Awaited<ReturnType<typeof load>>,
  from = "https://aurora.example.com/auth/oidc"
) {
  const response = await oidc.beginOidcFlow(settings, new Request(from), {
    intent: "signin",
    redirectTo: "/websites/abc/analytics",
    userId: null,
  });
  const cookie = response.headers.get("Set-Cookie")!.split(";")[0];
  const location = new URL(response.headers.get("Location")!);

  return { cookie, location };
}

beforeEach(() => {
  vi.mocked(client.discovery).mockReset();
  vi.mocked(client.discovery).mockResolvedValue(fakeConfig() as never);
  vi.mocked(client.authorizationCodeGrant).mockReset();
  vi.mocked(client.fetchUserInfo).mockReset();
});

describe("beginOidcFlow", () => {
  it("sends PKCE, state and nonce, and the configured redirect URI", async () => {
    const { location } = await startFlow(await load());

    expect(Object.fromEntries(location.searchParams)).toMatchObject({
      redirect_uri: "https://aurora.example.com/auth/oidc/callback",
      scope: "openid email profile",
      code_challenge_method: "S256",
      state: expect.any(String),
      nonce: expect.any(String),
      code_challenge: expect.any(String),
    });
  });

  it("does not cache a failed discovery", async () => {
    const oidc = await load();
    vi.mocked(client.discovery).mockRejectedValueOnce(
      new Error("ECONNREFUSED")
    );

    await expect(startFlow(oidc)).rejects.toThrow("ECONNREFUSED");
    await expect(startFlow(oidc)).resolves.toBeDefined();
    expect(client.discovery).toHaveBeenCalledTimes(2);
  });
});

describe("redirectUriFor", () => {
  const pick = async (url: string, headers: Record<string, string> = {}) => {
    const { redirectUriFor } = await load();

    return redirectUriFor(settings, new Request(url, { headers })).hostname;
  };

  it("picks the URI on the host the request came in on", async () => {
    expect(await pick("https://aurora.example.de/auth/oidc")).toBe(
      "aurora.example.de"
    );
    expect(await pick("https://aurora.example.com/auth/oidc")).toBe(
      "aurora.example.com"
    );
  });

  /**
   * react-router-serve does not trust proxies, so behind one `request.url`
   * carries whatever Host the proxy forwarded — often an internal name.
   */
  it("believes a forwarded host, which can only pick among registered URIs", async () => {
    expect(
      await pick("http://aurora:3000/auth/oidc", {
        "X-Forwarded-Host": "Aurora.Example.DE:443",
      })
    ).toBe("aurora.example.de");
  });

  it("prefers the forwarded host when Host names another registered one", async () => {
    expect(
      await pick("https://aurora.example.com/auth/oidc", {
        "X-Forwarded-Host": "aurora.example.de",
      })
    ).toBe("aurora.example.de");
  });

  it("falls back to the first URI on a host it does not know", async () => {
    expect(await pick("http://10.0.0.7:3000/auth/oidc")).toBe(
      "aurora.example.com"
    );
    expect(
      await pick("http://10.0.0.7:3000/auth/oidc", {
        "X-Forwarded-Host": "evil.example",
      })
    ).toBe("aurora.example.com");
  });
});

describe("readFlow", () => {
  it("reads back the flow the redirect planted", async () => {
    const oidc = await load();
    const { cookie, location } = await startFlow(
      oidc,
      "https://aurora.example.de/auth/oidc"
    );

    const flow = await oidc.readFlow(
      new Request("https://aurora.example.com/auth/oidc/callback", {
        headers: { Cookie: cookie },
      })
    );

    expect(location.searchParams.get("redirect_uri")).toBe(
      "https://aurora.example.de/auth/oidc/callback"
    );
    expect(flow).toMatchObject({
      intent: "signin",
      redirectTo: "/websites/abc/analytics",
      redirectUri: "https://aurora.example.de/auth/oidc/callback",
      state: location.searchParams.get("state"),
      nonce: location.searchParams.get("nonce"),
    });
  });

  /** The intent and the user it is for are what the signature protects. */
  it("refuses a cookie that was edited", async () => {
    const oidc = await load();
    const { cookie } = await startFlow(oidc);
    const [name, value] = cookie.split("=");
    // A complete, well-formed flow with only the intent and user changed, and
    // the original signature kept: only the signature check can refuse it.
    const signed = decodeURIComponent(value);
    const dot = signed.lastIndexOf(".");
    const payload = JSON.parse(atob(signed.slice(0, dot)));
    const edited = btoa(
      JSON.stringify({ ...payload, intent: "link", userId: "victim" })
    );
    const forged = `${name}=${encodeURIComponent(`${edited}${signed.slice(dot)}`)}`;

    await expect(
      oidc.readFlow(
        new Request("https://aurora.example.com/", {
          headers: { Cookie: forged },
        })
      )
    ).resolves.toBeNull();
  });

  it("is null with no cookie", async () => {
    const oidc = await load();

    await expect(
      oidc.readFlow(new Request("https://aurora.example.com/"))
    ).resolves.toBeNull();
  });
});

describe("completeOidcFlow", () => {
  const flow = {
    state: "st",
    nonce: "no",
    verifier: "ve",
    redirectUri: "https://aurora.example.com/auth/oidc/callback",
    redirectTo: "/",
    intent: "signin" as const,
    userId: null,
  };

  /**
   * Behind a TLS-terminating proxy the request arrives as http:// on an
   * internal host. openid-client sends this URL back as `redirect_uri`, and a
   * provider compares it byte for byte with the registered one.
   */
  it("redeems the code against the configured URL, not the request's", async () => {
    const oidc = await load();
    vi.mocked(client.authorizationCodeGrant).mockResolvedValue(
      tokens() as never
    );

    await oidc.completeOidcFlow(
      settings,
      new Request("http://10.0.0.7:3000/auth/oidc/callback?code=c&state=st"),
      flow
    );

    const [, url, checks] = vi.mocked(client.authorizationCodeGrant).mock
      .calls[0];

    expect((url as URL).href).toBe(
      "https://aurora.example.com/auth/oidc/callback?code=c&state=st"
    );
    expect(checks).toEqual({
      pkceCodeVerifier: "ve",
      expectedState: "st",
      expectedNonce: "no",
      idTokenExpected: true,
    });
  });

  it("redeems against the URI the flow went out through", async () => {
    const oidc = await load();
    vi.mocked(client.authorizationCodeGrant).mockResolvedValue(
      tokens() as never
    );

    await oidc.completeOidcFlow(
      settings,
      new Request("http://aurora:3000/auth/oidc/callback?code=c&state=st"),
      { ...flow, redirectUri: "https://aurora.example.de/auth/oidc/callback" }
    );

    const [, url] = vi.mocked(client.authorizationCodeGrant).mock.calls[0];

    expect((url as URL).origin).toBe("https://aurora.example.de");
  });

  it("refuses a flow sent through a URI no longer configured", async () => {
    const oidc = await load();

    await expect(
      oidc.completeOidcFlow(
        settings,
        new Request("https://aurora.example.com/auth/oidc/callback"),
        { ...flow, redirectUri: "https://old.example.com/auth/oidc/callback" }
      )
    ).rejects.toMatchObject({ name: "OidcError", failure: "failed" });
    expect(client.authorizationCodeGrant).not.toHaveBeenCalled();
  });

  it("returns the profile, address lowercased", async () => {
    const oidc = await load();
    vi.mocked(client.authorizationCodeGrant).mockResolvedValue(
      tokens() as never
    );

    await expect(
      oidc.completeOidcFlow(
        settings,
        new Request("https://aurora.example.com/auth/oidc/callback"),
        flow
      )
    ).resolves.toEqual({
      issuer: claims.iss,
      subject: claims.sub,
      email: "ada@example.com",
      emailVerified: true,
      firstname: "Ada",
      lastname: "Lovelace",
    });
    expect(client.fetchUserInfo).not.toHaveBeenCalled();
  });

  it("asks userinfo when the ID token has no email", async () => {
    const oidc = await load();
    vi.mocked(client.discovery).mockResolvedValue(
      fakeConfig("https://id.example.com/userinfo") as never
    );
    vi.mocked(client.authorizationCodeGrant).mockResolvedValue(
      tokens({ iss: claims.iss, sub: claims.sub }) as never
    );
    vi.mocked(client.fetchUserInfo).mockResolvedValue({
      sub: claims.sub,
      email: "ada@example.com",
      email_verified: true,
      name: "Ada King Lovelace",
    } as never);

    const profile = await oidc.completeOidcFlow(
      settings,
      new Request("https://aurora.example.com/auth/oidc/callback"),
      flow
    );

    expect(client.fetchUserInfo).toHaveBeenCalledWith(
      expect.anything(),
      "at",
      claims.sub
    );
    expect(profile).toMatchObject({
      email: "ada@example.com",
      emailVerified: true,
      firstname: "Ada King",
      lastname: "Lovelace",
    });
  });

  it("reads a refusal at the provider as denied", async () => {
    const oidc = await load();
    vi.mocked(client.authorizationCodeGrant).mockRejectedValue(
      new client.AuthorizationResponseError("access_denied", {
        cause: new URLSearchParams({ error: "access_denied" }),
      })
    );

    await expect(
      oidc.completeOidcFlow(
        settings,
        new Request("https://aurora.example.com/auth/oidc/callback"),
        flow
      )
    ).rejects.toMatchObject({ name: "OidcError", failure: "denied" });
  });

  it("reads anything else as failed", async () => {
    const oidc = await load();
    vi.mocked(client.authorizationCodeGrant).mockRejectedValue(
      new Error("unexpected JWT claim value encountered")
    );

    await expect(
      oidc.completeOidcFlow(
        settings,
        new Request("https://aurora.example.com/auth/oidc/callback"),
        flow
      )
    ).rejects.toMatchObject({ name: "OidcError", failure: "failed" });
  });
});

describe("toProfile", () => {
  const base = {
    iss: "https://id.example.com",
    sub: "s",
    aud: "a",
    iat: 0,
    exp: 0,
  };

  it.each([
    [
      "the given and family names",
      { given_name: "Ada", family_name: "Lovelace" },
      ["Ada", "Lovelace"],
    ],
    [
      "a display name, split at its last space",
      { name: "Ada King Lovelace" },
      ["Ada King", "Lovelace"],
    ],
    ["a one-word display name", { name: "Ada" }, ["Ada", ""]],
    ["the username", { preferred_username: "ada" }, ["ada", ""]],
    ["the mailbox name", { email: "ada@example.com" }, ["ada", ""]],
    ["nothing", {}, ["", ""]],
  ])("names the account from %s", async (_label, extra, [first, last]) => {
    const { toProfile } = await load();

    expect(toProfile({ ...base, ...extra })).toMatchObject({
      firstname: first,
      lastname: last,
    });
  });

  it.each([
    [true, true],
    ["true", true],
    [false, false],
    ["false", false],
    [undefined, null],
    ["yes", null],
  ])("reads email_verified=%o as %o", async (value, expected) => {
    const { toProfile } = await load();

    expect(
      toProfile({ ...base, email: "a@b.test", email_verified: value })
        .emailVerified
    ).toBe(expected);
  });

  it("drops an address that is not one", async () => {
    const { toProfile } = await load();

    expect(toProfile({ ...base, email: "not-an-address" })).toMatchObject({
      email: null,
      emailVerified: null,
    });
  });

  /** Never the address from one source and the flag from the other. */
  it("takes the address and its flag from the same source", async () => {
    const { toProfile } = await load();

    expect(
      toProfile({ ...base, email_verified: true } as never, {
        sub: "s",
        email: "a@b.test",
      })
    ).toMatchObject({ email: "a@b.test", emailVerified: null });
  });
});
