import { describe, expect, it } from "vitest";
import { parse } from "./ua.server";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const byType = (ua: string) =>
  Object.fromEntries(parse(ua).elements.map((e) => [e.type, e.value]));

describe("parse", () => {
  it("extracts browser, os, engine and device from a desktop UA", () => {
    expect(byType(CHROME_MAC)).toMatchObject({
      browser: "Chrome",
      os: "macOS",
      engine: "Blink",
      device: "Desktop",
    });
  });

  it("labels mobile devices", () => {
    expect(byType(IPHONE).device).toBe("Mobile");
  });

  it("defaults device to Desktop with a null version", () => {
    const device = parse(CHROME_MAC).elements.find((e) => e.type === "device");

    expect(device).toEqual({ type: "device", value: "Desktop", version: null });
  });

  it("omits partial entries rather than storing blanks", () => {
    // No browser/os/engine can be derived, so only the device fallback remains.
    const types = parse("").elements.map((e) => e.type);

    expect(types).toEqual(["device"]);
  });

  it("tolerates a missing user-agent header", () => {
    expect(() => parse(null)).not.toThrow();
    expect(() => parse(undefined)).not.toThrow();
  });
});
