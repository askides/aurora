import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clientIp,
  clientKey,
  SESSION_WINDOW_MS,
  visitorId,
} from "../visitor.server";

const headers = (init: Record<string, string>) => new Headers(init);

const CLIENT = headers({
  "x-forwarded-for": "203.0.113.7",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
});

const NOON = new Date("2026-08-04T12:00:00.000Z");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("clientIp", () => {
  it("takes the hop the nearest proxy added, not the one the caller typed", () => {
    // nginx's $proxy_add_x_forwarded_for and Cloudflare both *append* the
    // address they saw to whatever the client sent, so the front of the list is
    // the caller's own text and the back is the only entry with any evidence
    // behind it. Reading the front made the visitor id and the rate-limit key
    // both attacker-chosen: three requests, three "unique visitors".
    const spoofed = "9.9.9.9, 10.1.1.1, 203.0.113.7";

    expect(clientIp(headers({ "x-forwarded-for": spoofed }))).toBe(
      "203.0.113.7"
    );
  });

  it("prefers the headers an edge overwrites over the one it appends to", () => {
    // Cloudflare appends to a client-supplied XFF but replaces
    // cf-connecting-ip, so consulting XFF first let a caller shadow the one
    // header that could be trusted.
    expect(
      clientIp(
        headers({
          "cf-connecting-ip": "203.0.113.9",
          "x-forwarded-for": "9.9.9.9",
        })
      )
    ).toBe("203.0.113.9");
    expect(
      clientIp(headers({ "x-real-ip": "203.0.113.10", "x-forwarded-for": "" }))
    ).toBe("203.0.113.10");
  });

  it("believes only the named header once a deployment names one", async () => {
    vi.stubEnv("AURORA_IP_HEADER", "cf-connecting-ip");
    vi.resetModules();

    const configured = await import("../visitor.server");

    expect(
      configured.clientIp(
        headers({
          "cf-connecting-ip": "203.0.113.9",
          "x-real-ip": "9.9.9.9",
          "x-forwarded-for": "8.8.8.8",
        })
      )
    ).toBe("203.0.113.9");
    expect(
      configured.clientIp(headers({ "x-forwarded-for": "203.0.113.7" }))
    ).toBe("");
  });

  it("refuses anything that is not an address", () => {
    // The value is an HMAC input and a Map key, so a caller must not be able to
    // make it an arbitrary string of arbitrary length.
    expect(clientIp(headers({ "x-real-ip": "not-an-ip" }))).toBe("");
    expect(clientIp(headers({ "x-real-ip": "W".repeat(4_000) }))).toBe("");
    expect(clientIp(headers({ "x-forwarded-for": " , " }))).toBe("");
  });

  it("reads IPv6 as readily as IPv4", () => {
    expect(clientIp(headers({ "x-real-ip": "2001:db8::1" }))).toBe(
      "2001:db8::1"
    );
  });

  it("falls through a header that carries nothing usable", () => {
    expect(
      clientIp(
        headers({ "cf-connecting-ip": "unknown", "x-real-ip": "10.0.0.1" })
      )
    ).toBe("10.0.0.1");
  });

  it("reports no address when nothing proxies the request", () => {
    expect(clientIp(new Headers())).toBe("");
  });
});

describe("clientKey", () => {
  it("is the address whenever there is one", () => {
    expect(clientKey(CLIENT)).toBe("203.0.113.7");
  });

  it("still separates callers behind no proxy at all", () => {
    // One shared constant here would be one bucket for the whole process, and
    // an attacker draining it takes every site's ingest down together.
    const chrome = headers({ "user-agent": "Mozilla/5.0 Chrome/140" });
    const firefox = headers({ "user-agent": "Mozilla/5.0 Firefox/142" });

    expect(clientKey(chrome)).toBe(clientKey(chrome));
    expect(clientKey(chrome)).not.toBe(clientKey(firefox));
    expect(clientKey(new Headers())).toEqual(expect.any(String));
  });

  it("stays short whatever the header it was built from", () => {
    const huge = headers({ "user-agent": "W".repeat(16_000) });

    expect(clientKey(huge).length).toBeLessThanOrEqual(24);
  });
});

describe("visitorId", () => {
  it("is 22 url-safe characters", () => {
    expect(visitorId(CLIENT, "site", NOON)).toMatch(/^[\w-]{22}$/);
  });

  it("is stable across a UTC day and rotates at midnight", () => {
    const open = new Date("2026-08-04T00:00:00.000Z");
    const close = new Date("2026-08-04T23:59:59.999Z");
    const next = new Date("2026-08-05T00:00:00.000Z");

    expect(visitorId(CLIENT, "site", open)).toBe(
      visitorId(CLIENT, "site", close)
    );
    expect(visitorId(CLIENT, "site", next)).not.toBe(
      visitorId(CLIENT, "site", close)
    );
  });

  it("separates websites, addresses and user agents", () => {
    const base = visitorId(CLIENT, "site", NOON);
    const elsewhere = headers({
      "x-forwarded-for": "203.0.113.8",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    const other = headers({
      "x-forwarded-for": "203.0.113.7",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64)",
    });

    expect(visitorId(CLIENT, "other-site", NOON)).not.toBe(base);
    expect(visitorId(elsewhere, "site", NOON)).not.toBe(base);
    expect(visitorId(other, "site", NOON)).not.toBe(base);
  });

  it("cannot be split into fresh visitors by a forged forwarding header", () => {
    const forge = (spoof: string) =>
      visitorId(
        headers({
          "cf-connecting-ip": "203.0.113.7",
          "x-forwarded-for": `${spoof}, 203.0.113.7`,
          "user-agent": "Mozilla/5.0 Chrome/140",
        }),
        "site",
        NOON
      );

    expect(forge("9.9.9.1")).toBe(forge("9.9.9.2"));
    expect(forge("9.9.9.1")).toBe(forge("9.9.9.3"));
  });

  it("does not leak the address it was derived from", () => {
    expect(visitorId(CLIENT, "site", NOON)).not.toContain("203.0.113");
  });

  it("still identifies a reader behind a proxy that forwards nothing", () => {
    const bare = headers({ "user-agent": "Mozilla/5.0" });

    expect(visitorId(bare, "site", NOON)).toBe(visitorId(bare, "site", NOON));
  });

  it("keys the digest on the salt", async () => {
    vi.stubEnv("AURORA_SALT", "a-different-salt");
    vi.resetModules();

    const other = await import("../visitor.server");

    expect(other.visitorId(CLIENT, "site", NOON)).not.toBe(
      visitorId(CLIENT, "site", NOON)
    );
  });
});

describe("configuration", () => {
  it("refuses to boot in production without a salt", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AURORA_SALT", "");
    vi.resetModules();

    await expect(import("../visitor.server")).rejects.toThrow(/AURORA_SALT/);
  });

  it("boots in production once a salt is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AURORA_SALT", "a-configured-salt");
    vi.resetModules();

    await expect(import("../visitor.server")).resolves.toBeDefined();
  });
});

describe("SESSION_WINDOW_MS", () => {
  it("is the 30 minutes the dashboard's session figures assume", () => {
    expect(SESSION_WINDOW_MS).toBe(1_800_000);
  });
});
