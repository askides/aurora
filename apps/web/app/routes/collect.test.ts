import { describe, expect, it, vi } from "vitest";

// The route modules pull in the database layer at import time; these tests only
// exercise their payload schemas, so the DB module is stubbed out.
vi.mock("~/lib/queries.server", () => ({
  db: {},
  getWebsite: vi.fn(),
}));

const { collectSchema } = await import("./collect");
const { durationSchema } = await import("./collect.$id");

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
    expect(collectSchema.parse(payload).lastPageViewID).toBeNull();
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
