import { describe, expect, it, vi } from "vitest";

// These route modules import the database and session layers at module scope;
// the tests below only cover their form schemas, so both are stubbed.
vi.mock("~/lib/queries.server", () => ({
  countUsers: vi.fn(),
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("~/lib/session.server", () => ({
  createUserSession: vi.fn(),
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

const { signInSchema } = await import("./signin");
const { setupSchema } = await import("./setup");
const { accountSchema } = await import("./account");
const { websiteSchema } = await import("~/components/website-form");

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

describe("setupSchema", () => {
  const valid = {
    firstname: "Renato",
    lastname: "Pozzi",
    email: "a@b.com",
    password: "supersecret1",
  };

  it("accepts a complete payload", () => {
    expect(setupSchema.safeParse(valid).success).toBe(true);
  });

  it("requires at least 8 characters of password", () => {
    expect(setupSchema.safeParse({ ...valid, password: "short" }).success).toBe(
      false
    );
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
