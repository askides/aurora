import { describe, expect, it } from "vitest";
import {
  ACCEPT_CH,
  isBot,
  parseClientHints,
  parseUserAgent,
  parseUserAgentString,
  screenClass,
} from "../ua.server";

const headers = (init: Record<string, string>) => new Headers(init);

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

/**
 * The reduced strings Chromium actually ships. Every platform version in them
 * is frozen: `Mac OS X 10_15_7` whatever the Mac is running, `Windows NT 10.0`
 * for both 10 and 11, `Android 10` for every phone.
 */
const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36";

/** What Chrome 139 sends unasked on a secure cross-origin subresource. */
const CHROME_BRANDS =
  '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"';

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1";

const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1";

const SMART_TV =
  "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 76.0.3809.146 Safari/537.36";

const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

describe("ACCEPT_CH", () => {
  it("asks for every hint something in this file reads", () => {
    // Named one by one rather than matched loosely: every entry starts with
    // "Sec-CH-UA", so a `toContain('Sec-CH-UA')` was satisfied by any prefix of
    // the list, and each of these feeds a column.
    for (const hint of [
      "Sec-CH-UA", // browser, browser_version
      "Sec-CH-UA-Platform", // os
      "Sec-CH-UA-Platform-Version", // os_version
      "Sec-CH-UA-Mobile", // device
      "Sec-CH-UA-Model", // device, for the tablets ?0 would call desktops
    ]) {
      expect(ACCEPT_CH.split(", ")).toContain(hint);
    }
  });
});

describe("parseClientHints", () => {
  it("picks the branded browser out of the list", () => {
    const chrome = parseClientHints(
      headers({
        "sec-ch-ua":
          '"Not)A;Brand";v="8", "Chromium";v="139", "Google Chrome";v="139"',
      })
    );

    expect(chrome).toMatchObject({
      // Not "Google Chrome": Sec-CH-UA is only sent on secure requests, so
      // spelling it the hints' way put the same browser in two buckets decided
      // by whether the customer's page was served over TLS.
      browser: "Chrome",
      browser_version: "139",
    });
  });

  it("spells a browser the way the user agent string does", () => {
    const brand = (value: string) =>
      parseClientHints(headers({ "sec-ch-ua": value })).browser;

    expect(brand('"Google Chrome";v="139", "Chromium";v="139"')).toBe("Chrome");
    expect(brand('"Microsoft Edge";v="139", "Chromium";v="139"')).toBe("Edge");
    // Everything else already agrees, and inventing a spelling for it would be
    // worse than the split.
    expect(brand('"Opera";v="119", "Chromium";v="133"')).toBe("Opera");
    expect(brand('"Brave";v="139", "Chromium";v="139"')).toBe("Brave");
  });

  it("discards every spelling of the GREASE brand", () => {
    const spellings = [
      '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
      '"Not_A Brand";v="24", "Microsoft Edge";v="139", "Chromium";v="139"',
      '"(Not(A:Brand";v="8", "Microsoft Edge";v="139", "Chromium";v="139"',
      '" Not A;Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
    ];

    for (const value of spellings) {
      expect(parseClientHints(headers({ "sec-ch-ua": value })).browser).toBe(
        "Edge"
      );
    }
  });

  it("keeps the fork's own version rather than Chromium's", () => {
    // Opera 119 ships on Chromium 133; taking the version field by field would
    // report Opera 133, a release that does not exist.
    expect(
      parseClientHints(
        headers({
          "sec-ch-ua":
            '"Opera";v="119", "Chromium";v="133", "Not(A:Brand";v="24"',
        })
      )
    ).toMatchObject({ browser: "Opera", browser_version: "119" });
  });

  it("falls back to Chromium when that is all the browser claims", () => {
    expect(
      parseClientHints(
        headers({ "sec-ch-ua": '"Chromium";v="139", "Not_A Brand";v="24"' })
      ).browser
    ).toBe("Chromium");
  });

  it("says nothing when the list is only GREASE, or absent", () => {
    expect(
      parseClientHints(headers({ "sec-ch-ua": '"Not_A Brand";v="24"' }))
    ).toEqual({});
    expect(parseClientHints(new Headers())).toEqual({});
  });

  it("maps the Windows platform version to the release it means", () => {
    const windows = (version: string) =>
      parseClientHints(
        headers({
          "sec-ch-ua-platform": '"Windows"',
          "sec-ch-ua-platform-version": version,
        })
      );

    expect(windows('"15.0.0"')).toMatchObject({
      os: "Windows",
      os_version: "11",
    });
    expect(windows('"13.0.0"')).toMatchObject({ os_version: "11" });
    expect(windows('"10.0.0"')).toMatchObject({ os_version: "10" });
    expect(windows('"1.0.0"')).toMatchObject({ os_version: "10" });
    // 0.x is 7, 8 or 8.1, which the header cannot tell apart.
    expect(windows('"0.3.0"')).toMatchObject({
      os: "Windows",
      os_version: null,
    });
  });

  it("keeps the major of every other platform version", () => {
    expect(
      parseClientHints(
        headers({
          "sec-ch-ua-platform": '"macOS"',
          "sec-ch-ua-platform-version": '"15.3.1"',
        })
      )
    ).toMatchObject({ os: "macOS", os_version: "15" });
  });

  it("keeps the platform when its version was never requested", () => {
    expect(
      parseClientHints(headers({ "sec-ch-ua-platform": '"macOS"' }))
    ).toMatchObject({ os: "macOS", os_version: null });
  });

  it("ignores the Unknown platform", () => {
    expect(
      parseClientHints(headers({ "sec-ch-ua-platform": '"Unknown"' })).os
    ).toBeUndefined();
  });

  it("reads the form factor from mobile, platform and model together", () => {
    const device = (init: Record<string, string>) =>
      parseClientHints(headers(init)).device;

    expect(device({ "sec-ch-ua-mobile": "?1" })).toBe("mobile");
    expect(
      device({ "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"' })
    ).toBe("desktop");
    // Chrome reports ?0 on Android tablets, and a model is only ever sent by a
    // device that has one.
    expect(
      device({ "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Android"' })
    ).toBe("tablet");
    expect(
      device({ "sec-ch-ua-mobile": "?0", "sec-ch-ua-model": '"SM-X200"' })
    ).toBe("tablet");
    expect(device({ "sec-ch-ua-platform": '"Windows"' })).toBeUndefined();
  });
});

describe("parseUserAgentString", () => {
  it("reads a desktop browser", () => {
    expect(parseUserAgentString(CHROME_MAC)).toEqual({
      browser: "Chrome",
      browser_version: "139",
      os: "macOS",
      os_version: "10",
      device: "desktop",
    });
  });

  it("separates phones from tablets", () => {
    expect(parseUserAgentString(IPHONE).device).toBe("mobile");
    expect(parseUserAgentString(IPAD).device).toBe("tablet");
  });

  it("leaves a form factor the column cannot hold unknown", () => {
    // 'smarttv' is not one of desktop/mobile/tablet, and folding it into
    // desktop would be an invention rather than a fallback.
    expect(parseUserAgentString(SMART_TV).device).toBeNull();
  });

  it("keeps a name whose version it could not find", () => {
    const macOS = parseUserAgentString(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36"
    );

    expect(macOS.os).toBe("macOS");
    expect(macOS.os_version).toBeNull();
  });

  it("stores the major and nothing more", () => {
    expect(parseUserAgentString(CHROME_MAC).browser_version).toBe("139");
  });

  it("tolerates a missing user-agent header", () => {
    const nothing = {
      browser: null,
      browser_version: null,
      os: null,
      os_version: null,
      device: null,
    };

    expect(parseUserAgentString("")).toEqual(nothing);
    expect(parseUserAgentString(null)).toEqual(nothing);
    expect(parseUserAgentString(undefined)).toEqual(nothing);
  });
});

describe("parseUserAgent", () => {
  it("prefers the hints over the string", () => {
    expect(
      parseUserAgent(
        headers({
          "user-agent": CHROME_MAC,
          "sec-ch-ua":
            '"Opera";v="119", "Chromium";v="133", "Not(A:Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-ch-ua-platform-version": '"15.0.0"',
        })
      )
    ).toEqual({
      browser: "Opera",
      browser_version: "119",
      os: "Windows",
      os_version: "11",
      device: "desktop",
    });
  });

  it("never mixes one source's name with the other's version", () => {
    const mixed = parseUserAgent(
      headers({
        "user-agent": CHROME_MAC,
        "sec-ch-ua": '"Opera";v=""',
      })
    );

    expect(mixed.browser).toBe("Opera");
    expect(mixed.browser_version).toBeNull();
    // The string still answers everything the hints did not.
    expect(mixed.os).toBe("macOS");
  });

  it("falls back per dimension, not all or nothing", () => {
    expect(
      parseUserAgent(
        headers({ "user-agent": IPHONE, "sec-ch-ua-platform": '"iOS"' })
      )
    ).toEqual({
      browser: "Mobile Safari",
      browser_version: "18",
      os: "iOS",
      // The string reports 18.3 too, so the platforms agreeing is what lets
      // the version through — see the next test.
      os_version: "18",
      device: "mobile",
    });
  });

  /**
   * `Accept-CH` is only honoured on a top-level navigation response, and this
   * origin serves nothing but beacons — so Sec-CH-UA-Platform-Version never
   * arrives while the low-entropy Sec-CH-UA-Platform arrives unasked on every
   * secure request. Coupling the version to the name therefore wrote null into
   * os_version for ~100% of Chromium traffic, permanently.
   */
  it("keeps the string's os version when the hints name the same platform", () => {
    expect(
      parseUserAgent(
        headers({
          "user-agent": CHROME_MAC,
          "sec-ch-ua": '"Google Chrome";v="139", "Chromium";v="139"',
          "sec-ch-ua-platform": '"macOS"',
        })
      )
    ).toMatchObject({ os: "macOS", os_version: "10", browser: "Chrome" });
  });

  it("does not lend one platform's version to another", () => {
    expect(
      parseUserAgent(
        headers({ "user-agent": CHROME_MAC, "sec-ch-ua-platform": '"Android"' })
      )
    ).toMatchObject({ os: "Android", os_version: null });
  });

  it("prefers the hinted version when the hints actually sent one", () => {
    expect(
      parseUserAgent(
        headers({
          "user-agent": CHROME_MAC,
          "sec-ch-ua-platform": '"macOS"',
          "sec-ch-ua-platform-version": '"15.3.1"',
        })
      )
    ).toMatchObject({ os: "macOS", os_version: "15" });
  });

  /**
   * The four columns below are the only values in the whole insert that come
   * from a header rather than from the request body, and every string in the
   * body is byte-bound before it reaches a column. `sec-ch-ua` is client-set up
   * to Node's ~16KB header limit, so without this one request could write 16KB
   * into the browsers panel and another 16KB into the OS panel.
   */
  it("drops a header-supplied name too long to be one", () => {
    const long = "B".repeat(16_000);

    expect(
      parseUserAgent(
        headers({
          "user-agent": CHROME_MAC,
          "sec-ch-ua": `"${long}";v="1"`,
          "sec-ch-ua-platform": `"${long}"`,
          "sec-ch-ua-platform-version": '"15.0.0"',
        })
      )
    ).toMatchObject({
      browser: null,
      // Dropped with its name: a version beside no browser is a row every
      // panel files as unknown while still claiming a version was known.
      browser_version: null,
      os: null,
      os_version: null,
    });
  });

  it("bounds those names by bytes, like every other stored string", () => {
    const brand = (length: number) =>
      parseUserAgent(headers({ "sec-ch-ua": `"${"é".repeat(length)}";v="1"` }))
        .browser;

    // 32 two-byte characters is 64 bytes; 33 is 66 and does not fit.
    expect(brand(32)).toBe("é".repeat(32));
    expect(brand(33)).toBeNull();
  });

  it("returns nulls for a request with no client information at all", () => {
    expect(parseUserAgent(new Headers())).toEqual({
      browser: null,
      browser_version: null,
      os: null,
      os_version: null,
      device: null,
    });
  });
});

/**
 * The version the headers cannot deliver, read out of the browser by the
 * tracker and posted in the beacon body instead. `Accept-CH` is stored only
 * from a top-level navigation response and this origin serves nothing but
 * beacons, so `Sec-CH-UA-Platform-Version` never arrives — while the string it
 * falls back to has been frozen by UA reduction, which makes the fallback wrong
 * rather than merely thin.
 */
describe("parseUserAgent with a payload hint", () => {
  const chromium = (ua: string, platform: string) =>
    headers({
      "user-agent": ua,
      "sec-ch-ua": CHROME_BRANDS,
      "sec-ch-ua-mobile": platform === "Android" ? "?1" : "?0",
      "sec-ch-ua-platform": `"${platform}"`,
    });

  it("recovers the macOS major the frozen string cannot give", () => {
    // `Mac OS X 10_15_7` is what every Chromium Mac reports and has since 2021.
    expect(parseUserAgent(chromium(CHROME_MAC, "macOS")).os_version).toBe("10");
    expect(
      parseUserAgent(chromium(CHROME_MAC, "macOS"), "15.3.1")
    ).toMatchObject({
      browser: "Chrome",
      browser_version: "139",
      os: "macOS",
      os_version: "15",
      device: "desktop",
    });
  });

  /**
   * The Microsoft table at the top of the file was dead code: it only ever ran
   * on a header that never arrives. The payload is what makes it run, and 11 is
   * the answer no UA string can give — the string says `Windows NT 10.0` for
   * both releases.
   */
  it("maps a Windows payload version through the Microsoft table", () => {
    const windows = (reported?: string) =>
      parseUserAgent(chromium(CHROME_WINDOWS, "Windows"), reported).os_version;

    expect(windows()).toBe("10");
    expect(windows("15.0.0")).toBe("11");
    expect(windows("13.0.0")).toBe("11");
    expect(windows("10.0.0")).toBe("10");
    // 0.x is 7, 8 or 8.1, which nothing can tell apart — and the frozen "10"
    // the string offers would be a worse answer than none.
    expect(windows("0.3.0")).toBeNull();
  });

  it("keeps the major of every other platform", () => {
    expect(
      parseUserAgent(chromium(CHROME_ANDROID, "Android"), "14.0.0")
    ).toMatchObject({ os: "Android", os_version: "14", device: "mobile" });
  });

  it("uses the string's platform when a permissions policy hid the hint", () => {
    // Low-entropy hints are sent by default but a customer page can restrict
    // them; `userAgentData` keeps working in the same document.
    expect(
      parseUserAgent(headers({ "user-agent": CHROME_WINDOWS }), "15.0.0")
    ).toMatchObject({ os: "Windows", os_version: "11" });
  });

  it("has no platform to lend a version to", () => {
    expect(parseUserAgent(new Headers(), "15.0.0")).toEqual({
      browser: null,
      browser_version: null,
      os: null,
      os_version: null,
      device: null,
    });
  });

  /**
   * Attacker-controlled like every other body field: the zod bound stops it
   * being long, and everything that is not a leading run of digits falls
   * through to the sources that were there before.
   */
  it("falls back exactly as before on a value it cannot read", () => {
    for (const junk of ["", "  ", "not-a-version", "v15", "🙂", null]) {
      expect(
        parseUserAgent(chromium(CHROME_WINDOWS, "Windows"), junk).os_version
      ).toBe("10");
    }
  });

  it("changes nothing else about the row", () => {
    // Safari has no userAgentData at all, so a browser could not produce this
    // pairing — it is here because a payload field is whatever a caller posts.
    expect(
      parseUserAgent(
        headers({ "user-agent": IPHONE, "sec-ch-ua-platform": '"iOS"' }),
        "18.3.1"
      )
    ).toEqual({
      browser: "Mobile Safari",
      browser_version: "18",
      os: "iOS",
      os_version: "18",
      device: "mobile",
    });
  });

  /**
   * A version the table cannot resolve is an answer, not a silence: 0.x is
   * Windows 7, 8 or 8.1, and the string's frozen "10" would be a confident
   * wrong answer where null is a correct missing one.
   */
  it("does not fall back to the frozen string once the payload has spoken", () => {
    expect(
      parseUserAgent(chromium(CHROME_WINDOWS, "Windows"), "0.3.0")
    ).toMatchObject({ os: "Windows", os_version: null });
  });

  it("is dropped with a platform name too long to store", () => {
    expect(
      parseUserAgent(
        headers({
          "user-agent": CHROME_WINDOWS,
          "sec-ch-ua-platform": `"${"W".repeat(16_000)}"`,
        }),
        "15.0.0"
      )
    ).toMatchObject({ os: null, os_version: null });
  });
});

describe("screenClass", () => {
  it("buckets on the layout's own breakpoints", () => {
    expect(screenClass(390)).toBe("mobile");
    expect(screenClass(639)).toBe("mobile");
    expect(screenClass(640)).toBe("tablet");
    expect(screenClass(1023)).toBe("tablet");
    expect(screenClass(1024)).toBe("laptop");
    expect(screenClass(1535)).toBe("laptop");
    expect(screenClass(1536)).toBe("desktop");
    expect(screenClass(3840)).toBe("desktop");
  });

  it("has no bucket for a width nobody reported", () => {
    expect(screenClass(undefined)).toBeNull();
    expect(screenClass(null)).toBeNull();
    expect(screenClass(0)).toBeNull();
    expect(screenClass(-1)).toBeNull();
    expect(screenClass(Number.NaN)).toBeNull();
    expect(screenClass(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("isBot", () => {
  it("recognises a crawler", () => {
    expect(isBot(GOOGLEBOT)).toBe(true);
  });

  it("leaves real browsers alone", () => {
    expect(isBot(CHROME_MAC)).toBe(false);
    expect(isBot(IPHONE)).toBe(false);
  });

  it("does not call a missing header a bot", () => {
    expect(isBot(null)).toBe(false);
    expect(isBot(undefined)).toBe(false);
    expect(isBot("")).toBe(false);
  });
});
