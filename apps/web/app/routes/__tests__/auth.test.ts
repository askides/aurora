import { beforeEach, describe, expect, it, vi } from "vitest";

// These route modules import the database and session layers at module scope;
// most of what follows covers their form schemas, so both are stubbed.
vi.mock("~/modules/auth/queries.server", () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("~/modules/auth/session.server", () => ({
  createUserSession: vi.fn(),
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

const { signInSchema } = await import("../signin");
const { signupSchema, action: signupAction } = await import("../signup");
const { accountSchema } = await import("../account");
const { createUser, getUserByEmail } =
  await import("~/modules/auth/queries.server");
const { websiteSchema } =
  await import("~/modules/websites/components/website-form");

describe("signInSchema", () => {
  it("accepts a well formed credential pair", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.com", password: "hunter22" }).success
    ).toBe(true);
  });

  it.each([
    { email: "nope", password: "hunter22" },
    { email: "a@b.com", password: "" },
  ])("rejects %o", (input) => {
    expect(signInSchema.safeParse(input).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    firstname: "Renato",
    lastname: "Pozzi",
    email: "a@b.com",
    password: "supersecret1",
  };

  it("accepts a complete payload", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("requires at least 8 characters of password", () => {
    expect(
      signupSchema.safeParse({ ...valid, password: "short" }).success
    ).toBe(false);
  });

  /**
   * Registration is open now, so two people can register the same address in
   * different capitalisations. Postgres compares text exactly, and the unique
   * index would hold both — one of them signing in with the address as they
   * think of it then reads as a wrong password. The lowercase has to happen
   * before the insert, which is here.
   */
  it("stores the address lowercased and trimmed", () => {
    const parsed = signupSchema.parse({ ...valid, email: "  Me@Example.COM " });

    expect(parsed.email).toBe("me@example.com");
  });
});

/**
 * The two answers that only became reachable when /setup turned into an open
 * /signup: until then exactly one account was ever created per instance, so a
 * second person taking an address was not a case the route could meet.
 */
describe("POST /signup", () => {
  const form = (fields: Record<string, string>) =>
    ({
      request: new Request("https://aurora.test/signup", {
        method: "POST",
        body: new URLSearchParams(fields),
      }),
      params: {},
      context: {},
    }) as unknown as Parameters<typeof signupAction>[0];

  const valid = {
    firstname: "Renato",
    lastname: "Pozzi",
    email: "taken@example.com",
    password: "supersecret1",
    confirmPassword: "supersecret1",
  };

  beforeEach(() => {
    vi.mocked(getUserByEmail).mockReset();
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockReset();
  });

  it("refuses an address that is already registered", async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({ id: "u1" } as never);

    await expect(signupAction(form(valid))).resolves.toEqual({
      error: "An account with that email already exists.",
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("answers a lost race the same way, off the constraint", async () => {
    // Both requests read "no such row" before either inserted; the unique index
    // is the only thing that sees the second one.
    vi.mocked(createUser).mockRejectedValue(
      Object.assign(new Error("insert failed"), {
        cause: { code: "23505" },
      })
    );

    await expect(signupAction(form(valid))).resolves.toEqual({
      error: "An account with that email already exists.",
    });
  });

  it("lets anything else through as a 500 rather than a form error", async () => {
    vi.mocked(createUser).mockRejectedValue(new Error("connection reset"));

    await expect(signupAction(form(valid))).rejects.toThrow("connection reset");
  });

  it("checks the address it will insert, not the one that was typed", async () => {
    vi.mocked(createUser).mockResolvedValue({ id: "u1" } as never);

    await signupAction(form({ ...valid, email: "  Taken@Example.COM " }));

    expect(getUserByEmail).toHaveBeenCalledWith("taken@example.com");
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "taken@example.com" })
    );
  });

  it("rejects a mistyped confirmation before touching the database", async () => {
    await expect(
      signupAction(form({ ...valid, confirmPassword: "supersecret2" }))
    ).resolves.toEqual({ error: "Passwords do not match." });
    expect(getUserByEmail).not.toHaveBeenCalled();
  });
});

describe("accountSchema", () => {
  const base = { firstname: "A", lastname: "B", email: "a@b.com" };

  it("treats a blank password as 'keep the current one'", () => {
    expect(accountSchema.safeParse({ ...base, password: "" }).success).toBe(
      true
    );
  });

  it("still enforces the minimum when a password is supplied", () => {
    expect(accountSchema.safeParse({ ...base, password: "abc" }).success).toBe(
      false
    );
  });
});

describe("websiteSchema", () => {
  it("requires name, url and an explicit visibility", () => {
    expect(
      websiteSchema.safeParse({
        name: "Blog",
        url: "https://example.com",
        is_public: false,
      }).success
    ).toBe(true);

    expect(
      websiteSchema.safeParse({ name: "", url: "x", is_public: true }).success
    ).toBe(false);
  });
});
