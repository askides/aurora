import { afterEach, describe, expect, it, vi } from "vitest";
import { country } from "../geo.server";

const headers = (init: Record<string, string>) => new Headers(init);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("country", () => {
  it("reads the header the edge in front happens to set", () => {
    expect(country(headers({ "cf-ipcountry": "IT" }))).toBe("IT");
    expect(country(headers({ "x-vercel-ip-country": "DE" }))).toBe("DE");
    expect(country(headers({ "fastly-geo-country": " fr " }))).toBe("FR");
  });

  it("ignores generic geo header names no edge owns", () => {
    // `x-country-code` and `x-geo-country` are not written or stripped by any
    // particular proxy, so on a deployment with no geo-aware edge — which the
    // module explicitly supports — they arrived from the caller verbatim and
    // the country breakdown was whatever they typed.
    expect(country(headers({ "x-country-code": "VA" }))).toBeNull();
    expect(country(headers({ "x-geo-country": "VA" }))).toBeNull();
    expect(
      country(headers({ "cf-ipcountry": "IT", "x-country-code": "VA" }))
    ).toBe("IT");
  });

  it("reads the header a deployment names for itself", async () => {
    vi.stubEnv("AURORA_COUNTRY_HEADER", "x-country-code");
    vi.resetModules();

    const configured = await import("../geo.server");

    expect(configured.country(headers({ "x-country-code": "IT" }))).toBe("IT");
    // And only that one: naming a header is a claim about one hop, not an
    // invitation to sniff the others as well.
    expect(configured.country(headers({ "cf-ipcountry": "DE" }))).toBeNull();
  });

  it("prefers the earlier header when several are set", () => {
    expect(
      country(headers({ "cf-ipcountry": "IT", "x-vercel-ip-country": "DE" }))
    ).toBe("IT");
  });

  it("falls through a placeholder to a proxy that does know", () => {
    expect(
      country(headers({ "cf-ipcountry": "XX", "x-vercel-ip-country": "IT" }))
    ).toBe("IT");
    expect(
      country(headers({ "cf-ipcountry": "T1", "x-vercel-ip-country": "IT" }))
    ).toBe("IT");
  });

  it("rejects the placeholders outright", () => {
    expect(country(headers({ "cf-ipcountry": "XX" }))).toBeNull();
    expect(country(headers({ "cf-ipcountry": "t1" }))).toBeNull();
  });

  it("rejects anything that is not two letters", () => {
    expect(country(headers({ "cf-ipcountry": "ITA" }))).toBeNull();
    expect(country(headers({ "cf-ipcountry": "I" }))).toBeNull();
    expect(country(headers({ "cf-ipcountry": "12" }))).toBeNull();
    expect(country(headers({ "cf-ipcountry": "" }))).toBeNull();
  });

  it("reports null behind a proxy with no geo awareness at all", () => {
    expect(country(new Headers())).toBeNull();
  });
});
