import {
  boundProps,
  boundRevenue,
  byteLength,
  clamp,
  normalizePath,
  readUtm,
} from "../payload";
import { describe, expect, it } from "vitest";

describe("byteLength", () => {
  it("counts utf-8 bytes and not utf-16 code units", () => {
    expect(byteLength("abc")).toBe(3);
    expect(byteLength("é")).toBe(2);
    expect(byteLength("日本")).toBe(6);
    // One code point, two code units, four bytes.
    expect(byteLength("🎉")).toBe(4);
  });
});

describe("clamp", () => {
  it("leaves a value inside the budget untouched", () => {
    expect(clamp("/pricing", 1024)).toBe("/pricing");
  });

  it("cuts by bytes, so a multibyte string loses more characters", () => {
    const cut = clamp("日".repeat(20), 12);

    expect(cut).toBe("日日日日");
    expect(byteLength(cut)).toBeLessThanOrEqual(12);
  });

  it("never returns more bytes than the budget however wide the script", () => {
    for (const sample of ["a".repeat(300), "é".repeat(300), "🎉".repeat(300)]) {
      expect(byteLength(clamp(sample, 64))).toBeLessThanOrEqual(64);
    }
  });
});

describe("normalizePath", () => {
  it("drops the query and the hash", () => {
    expect(normalizePath("/docs?utm_source=x")).toBe("/docs");
    expect(normalizePath("/docs#install")).toBe("/docs");
    expect(normalizePath("/docs?a=1#b")).toBe("/docs");
  });

  it("keeps a route-shaped fragment, which is a whole page", () => {
    expect(normalizePath("/", "#/settings")).toBe("/#/settings");
    expect(normalizePath("/app", "#/orders/42")).toBe("/app#/orders/42");
  });

  it("drops an anchor, which is a position inside one page", () => {
    expect(normalizePath("/pricing", "#plans")).toBe("/pricing");
    expect(normalizePath("/post", "#comment-1234")).toBe("/post");
    expect(normalizePath("/", "#")).toBe("/");
  });

  /**
   * The reason the rule is `#/` and not "any fragment": an OAuth implicit-flow
   * or magic-link callback puts a bearer token in the fragment, and `path` is
   * unbounded text rendered in a dashboard panel.
   */
  it("drops a fragment carrying a secret", () => {
    expect(
      normalizePath("/callback", "#access_token=ya29.a0Ae&token_type=Bearer")
    ).toBe("/callback");
    expect(normalizePath("/auth", "#id_token=eyJhbGciOi")).toBe("/auth");
  });

  it("strips the route's own query, so one page is one row", () => {
    expect(normalizePath("/", "#/orders?page=2")).toBe("/#/orders");
    expect(normalizePath("/", "#/search?q=a&utm_source=hn")).toBe("/#/search");
  });

  /**
   * The two ways a secret gets past the `#/` test. A redirect URI that already
   * carries a fragment is undefined territory in RFC 6749, and providers
   * resolve it by appending to the fragment that is already there.
   */
  it("ends the route before a token appended to it", () => {
    expect(normalizePath("/", "#/callback&access_token=ya29.a0AeXRPp")).toBe(
      "/#/callback"
    );
    expect(normalizePath("/", "#/callback#access_token=ya29.a0AeXRPp")).toBe(
      "/#/callback"
    );
    expect(normalizePath("/", "#/callback?code=4%2F0AX")).toBe("/#/callback");
  });

  it("collapses the router's root into the page it already names", () => {
    // `/` and `/#/` are the same page of a hash-routed app, and the boot-time
    // rewrite between them must not be a second row.
    expect(normalizePath("/", "#/")).toBe("/");
    expect(normalizePath("/", "#//")).toBe("/");
    expect(normalizePath("/app/", "#/")).toBe("/app");
  });

  it("collapses a trailing slash inside the route too", () => {
    expect(normalizePath("/", "#/docs/")).toBe("/#/docs");
    expect(normalizePath("/", "#/docs/?q=1")).toBe("/#/docs");
  });

  it("stays inside the byte bound once the route is added", () => {
    expect(
      byteLength(normalizePath(`/${"a".repeat(900)}`, `#/${"é".repeat(400)}`))
    ).toBeLessThanOrEqual(1024);
  });

  it("collapses a trailing slash the server would keep", () => {
    expect(normalizePath("/a/b/")).toBe("/a/b");
    expect(normalizePath("/a/b//")).toBe("/a/b");
  });

  it("keeps the bare root", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("?q=1")).toBe("/");
    expect(normalizePath("#top")).toBe("/");
  });

  it("roots a relative pathname", () => {
    expect(normalizePath("docs/install")).toBe("/docs/install");
  });

  it("stays inside the 1024-byte bound", () => {
    expect(
      byteLength(normalizePath(`/${"é".repeat(2000)}`))
    ).toBeLessThanOrEqual(1024);
  });
});

describe("readUtm", () => {
  it("is undefined when the url carries no campaign", () => {
    expect(readUtm("")).toBeUndefined();
    expect(readUtm("?ref=hn&gclid=abc")).toBeUndefined();
  });

  // A single non-empty utm value forces channel = "campaign" server-side, so
  // an object of blanks would rewrite the acquisition of a visit that had none.
  it("is undefined when every parameter is blank", () => {
    expect(readUtm("?utm_source=&utm_medium=%20")).toBeUndefined();
  });

  it("keeps only the keys that are present", () => {
    expect(readUtm("?utm_source=hn&utm_campaign=launch&x=1")).toEqual({
      source: "hn",
      campaign: "launch",
    });
  });

  it("reads all five and trims them", () => {
    expect(
      readUtm(
        "?utm_source=a&utm_medium=b&utm_campaign=+c+&utm_term=d&utm_content=e"
      )
    ).toEqual({
      source: "a",
      medium: "b",
      campaign: "c",
      term: "d",
      content: "e",
    });
  });

  it("clamps a value to the 255 bytes the column takes", () => {
    const utm = readUtm(`?utm_campaign=${"x".repeat(400)}`);

    expect(utm?.campaign).toHaveLength(255);
  });
});

describe("boundProps", () => {
  it("passes the three types the server accepts", () => {
    expect(boundProps({ plan: "pro", seats: 4, trial: false })).toEqual({
      plan: "pro",
      seats: 4,
      trial: false,
    });
  });

  it("drops the values that would 422 the whole event", () => {
    expect(
      boundProps({
        keep: "yes",
        nothing: null,
        nested: { a: 1 },
        list: [1, 2],
        broken: Number.NaN,
        missing: undefined,
      })
    ).toEqual({ keep: "yes" });
  });

  it("keeps the first 24 keys and drops the rest", () => {
    const input: Record<string, number> = {};

    for (let index = 0; index < 40; index += 1) {
      input[`k${index}`] = index;
    }

    const props = boundProps(input);

    expect(Object.keys(props ?? {})).toHaveLength(24);
    expect(props?.k0).toBe(0);
    expect(props?.k24).toBeUndefined();
  });

  it("clamps keys and string values to the column bounds", () => {
    const props = boundProps({
      [`k${"e".repeat(200)}`]: "v".repeat(900),
    });
    const [key] = Object.keys(props ?? {});

    expect(key).toHaveLength(64);
    expect(props?.[key ?? ""]).toHaveLength(512);
  });

  it("is undefined for anything that is not a plain object of scalars", () => {
    expect(boundProps(undefined)).toBeUndefined();
    expect(boundProps(null)).toBeUndefined();
    expect(boundProps("props")).toBeUndefined();
    expect(boundProps([1, 2])).toBeUndefined();
    expect(boundProps({})).toBeUndefined();
    expect(boundProps({ nested: {} })).toBeUndefined();
  });
});

describe("boundRevenue", () => {
  it("keeps a well-formed pair whatever the currency case", () => {
    expect(boundRevenue({ amount: 49, currency: "eur" })).toEqual({
      amount: 49,
      currency: "eur",
    });
  });

  it("allows a refund", () => {
    expect(boundRevenue({ amount: -12.5, currency: "USD" })).toEqual({
      amount: -12.5,
      currency: "USD",
    });
  });

  it("drops a pair the schema would reject rather than lose the event", () => {
    expect(boundRevenue({ amount: 49 })).toBeUndefined();
    expect(boundRevenue({ amount: 49, currency: "euro" })).toBeUndefined();
    expect(boundRevenue({ amount: "49", currency: "EUR" })).toBeUndefined();
    expect(
      boundRevenue({ amount: Number.NaN, currency: "EUR" })
    ).toBeUndefined();
    expect(boundRevenue({ amount: 1e15, currency: "EUR" })).toBeUndefined();
    expect(boundRevenue(null)).toBeUndefined();
    expect(boundRevenue(42)).toBeUndefined();
  });
});
