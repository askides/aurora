import { describe, expect, it } from "vitest";
import {
  corsHeaders,
  corsJson,
  corsNoContent,
  originAllowed,
  preflight,
} from "../cors.server";

const SITE = "https://example.com";

describe("originAllowed", () => {
  it("accepts the registered host and the www spelling of it", () => {
    expect(originAllowed(SITE, SITE)).toBe(true);
    expect(originAllowed("https://www.example.com", SITE)).toBe(true);
    expect(originAllowed("https://EXAMPLE.COM", SITE)).toBe(true);
    // The website form stores whatever was typed, scheme or not.
    expect(originAllowed(SITE, "example.com")).toBe(true);
    expect(originAllowed(SITE, "https://WWW.Example.com/blog")).toBe(true);
  });

  /**
   * Near misses rather than unrelated hosts. `https://evil.test` shares no
   * substring with the registered domain, so it fails a suffix match, a
   * subdomain match and a scheme-blind parse just as readily as it fails the
   * correct one — it cannot falsify any of the ways this could go wrong.
   */
  it("refuses every host that merely resembles the registered one", () => {
    for (const origin of [
      "https://notexample.com",
      "https://myexample.com",
      "https://example.com.attacker.test",
      "https://example.com.evil.co",
      "https://sub.example.com",
      "https://docs.example.com",
      "https://example.org",
    ]) {
      expect(originAllowed(origin, SITE)).toBe(false);
    }
  });

  it("refuses an Origin that is not an absolute http(s) URL", () => {
    // `null` is what a sandboxed iframe or a data: document sends, and a bare
    // hostname is not an origin at all. Neither may be re-parsed into one.
    expect(originAllowed("null", SITE)).toBe(false);
    expect(originAllowed("example.com", SITE)).toBe(false);
    expect(originAllowed("android-app://com.example", SITE)).toBe(false);
    expect(originAllowed("", SITE)).toBe(false);
  });

  it("matches nothing at all when the website row has no usable url", () => {
    expect(originAllowed(SITE, "")).toBe(false);
    expect(originAllowed(SITE, "not a url")).toBe(false);
  });

  it("allows a local development origin outside production only", () => {
    for (const origin of [
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://[::1]:5173",
    ]) {
      expect(originAllowed(origin, SITE)).toBe(true);
    }

    process.env.NODE_ENV = "production";

    try {
      expect(originAllowed("http://localhost:5173", SITE)).toBe(false);
    } finally {
      process.env.NODE_ENV = "test";
    }
  });
});

describe("corsHeaders", () => {
  it("echoes the caller's own origin and never a wildcard", () => {
    const headers = corsHeaders(SITE);

    expect(headers["Access-Control-Allow-Origin"]).toBe(SITE);
    expect(Object.values(headers)).not.toContain("*");
  });

  it("names the two methods this endpoint answers and the one header it takes", () => {
    const headers = corsHeaders(SITE);

    expect(headers["Access-Control-Allow-Methods"]).toBe("POST,OPTIONS");
    // Covers both beacon shapes: a string sendBeacon is a simple request, and
    // a Blob beacon or a keepalive fetch preflights asking only for this.
    expect(headers["Access-Control-Allow-Headers"]).toBe("Content-Type");
    expect(headers["Access-Control-Max-Age"]).toBe("86400");
  });

  it("announces Vary: Origin whether or not an origin was named", () => {
    // The header a shared cache stores depends on the request's Origin either
    // way, and announcing it only when one was present is how a cache serves
    // one site's allowance to another.
    expect(corsHeaders(SITE).Vary).toBe("Origin");
    expect(corsHeaders(null).Vary).toBe("Origin");
    expect(corsHeaders(null)["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("never hands the opaque origin an allowance", () => {
    // `Access-Control-Allow-Origin: null` is matched by every sandboxed or
    // data:/file: document there is, which is the opposite of naming a caller.
    expect(corsHeaders("null")["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(corsHeaders("null").Vary).toBe("Origin");
  });

  it("asks for the client hints the ua columns are built from", () => {
    expect(corsHeaders(SITE)["Accept-CH"]).toBe(
      "Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Mobile, Sec-CH-UA-Model"
    );
  });
});

describe("responses", () => {
  it("answers a preflight with the headers and nothing else", async () => {
    const response = preflight(SITE);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("access-control-allow-origin")).toBe(SITE);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "POST,OPTIONS"
    );
  });

  it("answers success with no body at all", async () => {
    const response = corsNoContent(SITE);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("answers an error with a short message and the same headers", async () => {
    const response = corsJson({ message: "Not found" }, 404, SITE);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Not found" });
    expect(response.headers.get("access-control-allow-origin")).toBe(SITE);
    expect(response.headers.get("vary")).toBe("Origin");
  });
});
