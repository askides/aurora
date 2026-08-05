/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "blob:https://x.test/abc-123" }
 *
 * `location.protocol` is the test and `location.host === ""` was the old one:
 * they are different questions, and only a whole document with the wrong
 * scheme can tell them apart, hence a file of its own.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("non-http documents", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      language: "en-US",
      doNotTrack: null,
      sendBeacon: () => true,
    });
    vi.stubGlobal("fetch", () => Promise.resolve());
    vi.resetModules();
  });

  it("sends nothing, and does not try to resolve an endpoint first", async () => {
    const sendBeacon = vi.spyOn(navigator, "sendBeacon");
    const pushState = history.pushState;
    const script = document.createElement("script");

    // Relative, so resolving it against a blob: url would throw. Reaching
    // `new URL` at all is the failure this asserts against.
    script.setAttribute("aurora-id", "wid_test");
    script.setAttribute("src", "/tracker.js");
    document.head.append(script);

    await expect(import("../index")).resolves.toBeDefined();

    expect(location.protocol).toBe("blob:");
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(history.pushState).toBe(pushState);
    expect(typeof window.aurora).toBe("function");
  });
});
