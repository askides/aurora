import { describe, expect, it, vi } from "vitest";

vi.mock("../queries.server", () => ({ getUser: vi.fn() }));

const { commitSession, getCurrentUser, getSession, safeRedirect } =
  await import("../session.server");
const { getUser } = await import("../queries.server");

describe("safeRedirect", () => {
  it.each([
    ["/websites/abc/analytics?range=7d", "/websites/abc/analytics?range=7d"],
    ["/", "/"],
    // Protocol-relative: a browser reads the first segment as a host.
    ["//evil.example/path", "/"],
    // And so does a backslash, which browsers normalise to a slash.
    ["/\\evil.example", "/"],
    ["https://evil.example", "/"],
    ["account", "/"],
    ["", "/"],
    [null, "/"],
  ])("%o → %o", (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });
});

describe("getCurrentUser", () => {
  const request = async () => {
    const session = await getSession();
    session.set("userId", "u1");

    return new Request("https://aurora.test/", {
      headers: { Cookie: (await commitSession(session)).split(";")[0] },
    });
  };

  const row = {
    id: "u1",
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ada@example.com",
    created_at: new Date(0),
    updated_at: new Date(0),
  };

  it("says whether there is a password, and never what it is", async () => {
    vi.mocked(getUser).mockResolvedValue({ ...row, password: "$2a$10$hash" });

    const user = await getCurrentUser(await request());

    expect(user).toEqual({ ...row, has_password: true });
    expect(user).not.toHaveProperty("password");
  });

  it("reports an SSO-only account as having none", async () => {
    vi.mocked(getUser).mockResolvedValue({ ...row, password: null });

    expect(await getCurrentUser(await request())).toMatchObject({
      has_password: false,
    });
  });
});
