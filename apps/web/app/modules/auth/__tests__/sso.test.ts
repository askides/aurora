import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OidcSettings } from "../config.server";
import type { OidcProfile } from "../oidc.server";

vi.mock("../queries.server", () => ({
  createUserWithIdentity: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserByIdentity: vi.fn(),
  getUserIdentity: vi.fn(),
  linkIdentity: vi.fn(),
}));

const { connectIdentity, isAllowedByDomain, signInWithIdentity } =
  await import("../sso.server");
const queries = await import("../queries.server");

const settings = {
  providerName: "Keycloak",
  allowedDomains: [],
} as unknown as OidcSettings;

const profile: OidcProfile = {
  issuer: "https://id.example.com/realms/aurora",
  subject: "f81d4fae",
  email: "ada@example.com",
  emailVerified: true,
  firstname: "Ada",
  lastname: "Lovelace",
};

const uniqueViolation = () =>
  Object.assign(new Error("insert failed"), { cause: { code: "23505" } });

beforeEach(() => {
  vi.resetAllMocks();
});

describe("isAllowedByDomain", () => {
  it("lets everyone through with no allowlist", () => {
    expect(
      isAllowedByDomain({ ...profile, emailVerified: null, email: null }, [])
    ).toBe(true);
  });

  it("matches the domain exactly, not as a suffix", () => {
    expect(isAllowedByDomain(profile, ["example.com"])).toBe(true);
    expect(
      isAllowedByDomain({ ...profile, email: "ada@evil-example.com" }, [
        "example.com",
      ])
    ).toBe(false);
    expect(
      isAllowedByDomain({ ...profile, email: "ada@sub.example.com" }, [
        "example.com",
      ])
    ).toBe(false);
  });

  /**
   * The nOAuth shape: a provider that lets users type their own address admits
   * anyone who typed one in the right domain, unless "verified" is required.
   */
  it("refuses an address the provider does not vouch for", () => {
    expect(
      isAllowedByDomain({ ...profile, emailVerified: null }, ["example.com"])
    ).toBe(false);
  });
});

describe("signInWithIdentity", () => {
  it("signs a known identity into its account", async () => {
    vi.mocked(queries.getUserByIdentity).mockResolvedValue({
      id: "u1",
    } as never);

    await expect(signInWithIdentity(settings, profile)).resolves.toEqual({
      ok: true,
      userId: "u1",
    });
    expect(queries.createUserWithIdentity).not.toHaveBeenCalled();
  });

  it("creates an account for a new identity", async () => {
    vi.mocked(queries.createUserWithIdentity).mockResolvedValue({
      id: "u2",
    } as never);

    await expect(signInWithIdentity(settings, profile)).resolves.toEqual({
      ok: true,
      userId: "u2",
    });
    expect(queries.createUserWithIdentity).toHaveBeenCalledWith(
      { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
      { issuer: profile.issuer, subject: profile.subject }
    );
  });

  /**
   * The whole reason identities are never found by email: the account holding
   * this address may have been registered by someone else, ahead of time.
   */
  it("never attaches a new identity to an account found by email", async () => {
    vi.mocked(queries.getUserByEmail).mockResolvedValue({ id: "u3" } as never);

    await expect(signInWithIdentity(settings, profile)).resolves.toEqual({
      ok: false,
      failure: "account_exists",
    });
    expect(queries.createUserWithIdentity).not.toHaveBeenCalled();
    expect(queries.linkIdentity).not.toHaveBeenCalled();
  });

  it.each([
    [{ email: null }, "email_missing"],
    [{ emailVerified: false }, "email_unverified"],
  ] as const)(
    "refuses to create an account from %o",
    async (override, failure) => {
      await expect(
        signInWithIdentity(settings, { ...profile, ...override })
      ).resolves.toEqual({ ok: false, failure });
    }
  );

  it("creates an account when the provider does not say either way", async () => {
    vi.mocked(queries.createUserWithIdentity).mockResolvedValue({
      id: "u4",
    } as never);

    await expect(
      signInWithIdentity(settings, { ...profile, emailVerified: null })
    ).resolves.toEqual({ ok: true, userId: "u4" });
  });

  it("applies the allowlist to returning identities too", async () => {
    vi.mocked(queries.getUserByIdentity).mockResolvedValue({
      id: "u1",
    } as never);

    await expect(
      signInWithIdentity(
        { ...settings, allowedDomains: ["corp.example"] },
        profile
      )
    ).resolves.toEqual({ ok: false, failure: "domain_not_allowed" });
  });

  it("signs the loser of a creation race into the winner's account", async () => {
    vi.mocked(queries.getUserByIdentity)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "u5" } as never);
    vi.mocked(queries.createUserWithIdentity).mockRejectedValue(
      uniqueViolation()
    );

    await expect(signInWithIdentity(settings, profile)).resolves.toEqual({
      ok: true,
      userId: "u5",
    });
  });

  it("reads a lost race on the address as the address being taken", async () => {
    vi.mocked(queries.createUserWithIdentity).mockRejectedValue(
      uniqueViolation()
    );

    await expect(signInWithIdentity(settings, profile)).resolves.toEqual({
      ok: false,
      failure: "account_exists",
    });
  });

  it("lets anything else through as a 500", async () => {
    vi.mocked(queries.createUserWithIdentity).mockRejectedValue(
      new Error("connection reset")
    );

    await expect(signInWithIdentity(settings, profile)).rejects.toThrow(
      "connection reset"
    );
  });
});

describe("connectIdentity", () => {
  it("attaches a fresh identity to the signed-in account", async () => {
    await expect(connectIdentity(settings, "u1", profile)).resolves.toEqual({
      ok: true,
      userId: "u1",
    });
    expect(queries.linkIdentity).toHaveBeenCalledWith("u1", {
      issuer: profile.issuer,
      subject: profile.subject,
    });
  });

  it("is a no-op for an identity already on this account", async () => {
    vi.mocked(queries.getUserByIdentity).mockResolvedValue({
      id: "u1",
    } as never);

    await expect(connectIdentity(settings, "u1", profile)).resolves.toEqual({
      ok: true,
      userId: "u1",
    });
    expect(queries.linkIdentity).not.toHaveBeenCalled();
  });

  it("refuses an identity that belongs to another account", async () => {
    vi.mocked(queries.getUserByIdentity).mockResolvedValue({
      id: "u2",
    } as never);

    await expect(connectIdentity(settings, "u1", profile)).resolves.toEqual({
      ok: false,
      failure: "identity_in_use",
    });
  });

  it("refuses a second identity on the same account", async () => {
    vi.mocked(queries.getUserIdentity).mockResolvedValue({ id: "i1" } as never);

    await expect(connectIdentity(settings, "u1", profile)).resolves.toEqual({
      ok: false,
      failure: "already_connected",
    });
    expect(queries.linkIdentity).not.toHaveBeenCalled();
  });

  /** An existing account's address is irrelevant here — only who asked is. */
  it("does not care whether the addresses match", async () => {
    await expect(
      connectIdentity(settings, "u1", { ...profile, email: "other@x.test" })
    ).resolves.toEqual({ ok: true, userId: "u1" });
  });
});
