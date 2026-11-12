/**
 * Sign-in settings read from the environment, once, at boot.
 *
 * Everything here fails loudly rather than defaulting. A half-configured
 * identity provider that quietly turned SSO off, or a typo in the signup switch
 * that quietly left registration open, would both be found by someone other
 * than the operator who made them.
 */

export type ClientAuthMethod = "client_secret_basic" | "client_secret_post";

export type OidcSettings = {
  issuer: URL;
  clientId: string;
  /** Absent for a public client, which then leans on PKCE alone. */
  clientSecret: string | undefined;
  clientAuthMethod: ClientAuthMethod;
  /**
   * One per host the instance is served on, each registered at the provider.
   * A flow always comes back to the host it started on — the flow cookie and
   * the session it ends in are both host-only — so serving two domains takes
   * two redirect URIs, not one shared one.
   */
  redirectUris: URL[];
  /** What the button says: "Continue with <providerName>". */
  providerName: string;
  scope: string;
  /** Lowercased email domains; empty means the provider decides who gets in. */
  allowedDomains: string[];
};

export type AuthConfig = {
  oidc: OidcSettings | null;
  passwordSignup: boolean;
};

/**
 * The one path the callback is served on. Checked against the configured
 * redirect URI at boot, because the provider sends the browser wherever that
 * variable says — and a mismatch otherwise surfaces as a 404 on the way back,
 * after the user has already signed in at the provider.
 */
export const OIDC_CALLBACK_PATH = "/auth/oidc/callback";

const CLIENT_AUTH_METHODS: ClientAuthMethod[] = [
  "client_secret_basic",
  "client_secret_post",
];

function read(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim();

  return value ? value : undefined;
}

function readUrls(env: NodeJS.ProcessEnv, name: string) {
  const values = (read(env, name) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error(`${name} is required when OIDC_ISSUER is set.`);
  }

  return values.map((value) => {
    if (!URL.canParse(value)) {
      throw new Error(`${name} is not a valid URL: ${value}`);
    }

    return new URL(value);
  });
}

function readBoolean(env: NodeJS.ProcessEnv, name: string) {
  const value = read(env, name)?.toLowerCase();

  if (value === undefined || value === "false" || value === "0") {
    return false;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  throw new Error(`${name} must be "true" or "false", got "${env[name]}".`);
}

function readOidc(env: NodeJS.ProcessEnv): OidcSettings | null {
  if (!read(env, "OIDC_ISSUER")) {
    return null;
  }

  const [issuer, ...extra] = readUrls(env, "OIDC_ISSUER");

  if (extra.length > 0) {
    throw new Error("OIDC_ISSUER takes a single URL.");
  }

  const redirectUris = readUrls(env, "OIDC_REDIRECT_URI");
  const clientId = read(env, "OIDC_CLIENT_ID");

  if (!clientId) {
    throw new Error("OIDC_CLIENT_ID is required when OIDC_ISSUER is set.");
  }

  for (const uri of redirectUris) {
    if (uri.pathname !== OIDC_CALLBACK_PATH) {
      throw new Error(
        `OIDC_REDIRECT_URI must point at ${OIDC_CALLBACK_PATH} on this instance, e.g. https://aurora.example.com${OIDC_CALLBACK_PATH}; got ${uri.href}.`
      );
    }
  }

  // The host picks the URI, so two on one host would make one unreachable.
  const hosts = redirectUris.map((uri) => uri.hostname);
  const repeated = hosts.find((host, index) => hosts.indexOf(host) !== index);

  if (repeated) {
    throw new Error(`OIDC_REDIRECT_URI lists ${repeated} more than once.`);
  }

  const clientAuthMethod = (read(env, "OIDC_CLIENT_AUTH_METHOD") ??
    "client_secret_basic") as ClientAuthMethod;

  if (!CLIENT_AUTH_METHODS.includes(clientAuthMethod)) {
    throw new Error(
      `OIDC_CLIENT_AUTH_METHOD must be one of ${CLIENT_AUTH_METHODS.join(", ")}.`
    );
  }

  return {
    issuer,
    clientId,
    clientSecret: read(env, "OIDC_CLIENT_SECRET"),
    clientAuthMethod,
    redirectUris,
    providerName: read(env, "OIDC_PROVIDER_NAME") ?? "SSO",
    scope: read(env, "OIDC_SCOPES") ?? "openid email profile",
    allowedDomains: (read(env, "OIDC_ALLOWED_DOMAINS") ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean),
  };
}

export function readAuthConfig(env: NodeJS.ProcessEnv): AuthConfig {
  return {
    oidc: readOidc(env),
    passwordSignup: !readBoolean(env, "AURORA_DISABLE_PASSWORD_SIGNUP"),
  };
}

export const authConfig = readAuthConfig(process.env);

/**
 * An `http:` issuer is allowed — an identity provider on a private network is
 * an ordinary setup — but it means tokens cross the wire in the clear, so a
 * production boot says so where the operator will see it.
 */
if (
  authConfig.oidc?.issuer.protocol === "http:" &&
  process.env.NODE_ENV === "production"
) {
  console.warn(
    `aurora: OIDC_ISSUER is plain http (${authConfig.oidc.issuer.href}). Authorization codes and tokens will travel unencrypted between this instance and the identity provider.`
  );
}
