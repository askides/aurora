import { describe, expect, it } from "vitest";
import { readAuthConfig } from "../config.server";

const oidc = {
  OIDC_ISSUER: "https://id.example.com/realms/aurora",
  OIDC_CLIENT_ID: "aurora",
  OIDC_CLIENT_SECRET: "s3cret",
  OIDC_REDIRECT_URI: "https://aurora.example.com/auth/oidc/callback",
};

describe("readAuthConfig", () => {
  it("leaves SSO off and password signup on with nothing set", () => {
    expect(readAuthConfig({})).toEqual({
      oidc: null,
      passwordLogin: true,
      passwordSignup: true,
    });
  });

  it("reads a complete provider with its defaults", () => {
    const { oidc: settings } = readAuthConfig(oidc);

    expect(settings).toMatchObject({
      clientId: "aurora",
      clientSecret: "s3cret",
      clientAuthMethod: "client_secret_basic",
      providerName: "SSO",
      scope: "openid email profile",
      allowedDomains: [],
      providerLogout: true,
    });
    expect(settings?.issuer.href).toBe("https://id.example.com/realms/aurora");
    expect(settings?.redirectUris.map((uri) => uri.href)).toEqual([
      "https://aurora.example.com/auth/oidc/callback",
    ]);
  });

  /** One instance served on two domains, each with its own callback. */
  it("reads a list of redirect URIs", () => {
    const { oidc: settings } = readAuthConfig({
      ...oidc,
      OIDC_REDIRECT_URI:
        "https://aurora.example.com/auth/oidc/callback, https://aurora.example.de/auth/oidc/callback",
    });

    expect(settings?.redirectUris.map((uri) => uri.hostname)).toEqual([
      "aurora.example.com",
      "aurora.example.de",
    ]);
  });

  it("treats a blank issuer as unset, as an empty .env line leaves it", () => {
    expect(readAuthConfig({ ...oidc, OIDC_ISSUER: "  " }).oidc).toBeNull();
  });

  /**
   * Each of these used to be a way for SSO to be configured and silently not
   * work — every one of them now stops the boot with the variable's name.
   */
  it.each([
    [{ OIDC_CLIENT_ID: "" }, /OIDC_CLIENT_ID/],
    [{ OIDC_REDIRECT_URI: undefined }, /OIDC_REDIRECT_URI is required/],
    [{ OIDC_ISSUER: "not a url" }, /OIDC_ISSUER is not a valid URL/],
    [
      { OIDC_REDIRECT_URI: "https://aurora.example.com/callback" },
      /must point at \/auth\/oidc\/callback/,
    ],
    [{ OIDC_CLIENT_AUTH_METHOD: "private_key_jwt" }, /OIDC_CLIENT_AUTH_METHOD/],
    [
      {
        OIDC_REDIRECT_URI:
          "https://aurora.example.com/auth/oidc/callback,https://aurora.example.de/oops",
      },
      /got https:\/\/aurora.example.de\/oops/,
    ],
    [
      {
        OIDC_REDIRECT_URI:
          "https://aurora.example.com/auth/oidc/callback,http://aurora.example.com:8080/auth/oidc/callback",
      },
      /lists aurora.example.com more than once/,
    ],
    [
      { OIDC_ISSUER: "https://a.example.com,https://b.example.com" },
      /single URL/,
    ],
  ])("refuses %o", (override, message) => {
    expect(() => readAuthConfig({ ...oidc, ...override })).toThrow(message);
  });

  it("normalises the domain allowlist", () => {
    const { oidc: settings } = readAuthConfig({
      ...oidc,
      OIDC_ALLOWED_DOMAINS: " Example.com, @corp.example.org ,,",
    });

    expect(settings?.allowedDomains).toEqual([
      "example.com",
      "corp.example.org",
    ]);
  });

  it("allows a public client with no secret", () => {
    expect(
      readAuthConfig({ ...oidc, OIDC_CLIENT_SECRET: "" }).oidc?.clientSecret
    ).toBeUndefined();
  });

  it.each([
    ["true", false],
    ["1", false],
    ["TRUE", false],
    ["false", true],
    ["0", true],
    ["", true],
  ])("AURORA_DISABLE_PASSWORD_SIGNUP=%s leaves signup %s", (value, open) => {
    expect(
      readAuthConfig({ AURORA_DISABLE_PASSWORD_SIGNUP: value }).passwordSignup
    ).toBe(open);
  });

  it("lets provider logout be turned off", () => {
    expect(
      readAuthConfig({ ...oidc, OIDC_PROVIDER_LOGOUT: "false" }).oidc
        ?.providerLogout
    ).toBe(false);
  });

  it("turns password sign-in off, and signup with it", () => {
    expect(
      readAuthConfig({ ...oidc, AURORA_DISABLE_PASSWORD_LOGIN: "true" })
    ).toMatchObject({ passwordLogin: false, passwordSignup: false });
  });

  /** Neither way in would leave an instance nobody can enter. */
  it("refuses to turn password sign-in off without SSO", () => {
    expect(() =>
      readAuthConfig({ AURORA_DISABLE_PASSWORD_LOGIN: "true" })
    ).toThrow(/needs OIDC_ISSUER/);
  });

  /** A typo must not be the thing that leaves registration open. */
  it("refuses a switch value it cannot read", () => {
    expect(() =>
      readAuthConfig({ AURORA_DISABLE_PASSWORD_SIGNUP: "yes please" })
    ).toThrow(/AURORA_DISABLE_PASSWORD_SIGNUP/);
  });
});
