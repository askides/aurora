import { describe, expect, it } from "vitest";
import {
  accountSchema,
  collectSchema,
  durationSchema,
  setupSchema,
  signInSchema,
  websiteSchema,
} from "./validation";

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

describe("collectSchema", () => {
  const payload = {
    type: "pageView",
    element: "/home",
    wid: "cuid",
    language: "en-US",
    referrer: "",
    isNewVisitor: true,
    isNewSession: true,
    lastPageViewID: null,
  };

  it("accepts what the tracker sends", () => {
    expect(collectSchema.safeParse(payload).success).toBe(true);
  });

  it("allows a null lastPageViewID on a first view", () => {
    const parsed = collectSchema.parse(payload);

    expect(parsed.lastPageViewID).toBeNull();
  });

  it("requires element and wid", () => {
    expect(collectSchema.safeParse({ ...payload, element: "" }).success).toBe(
      false
    );
    expect(collectSchema.safeParse({ ...payload, wid: "" }).success).toBe(
      false
    );
  });
});

describe("durationSchema", () => {
  it("accepts a beacon payload", () => {
    expect(
      durationSchema.safeParse({ wid: "cuid", duration: 4200 }).success
    ).toBe(true);
  });

  it("rejects a non-numeric duration", () => {
    expect(
      durationSchema.safeParse({ wid: "cuid", duration: "4200" }).success
    ).toBe(false);
  });
});
