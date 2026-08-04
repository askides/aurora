import { send } from "../transport";
import { afterEach, describe, expect, it, vi } from "vitest";

const payload = { wid: "w", vid: "v", duration: 10 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("send", () => {
  it("posts the json body through sendBeacon and reads nothing back", () => {
    const sendBeacon = vi.fn(() => true);
    const fetch = vi.fn();

    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetch);

    send("https://a.test/collect/duration", payload);

    expect(sendBeacon).toHaveBeenCalledWith(
      "https://a.test/collect/duration",
      JSON.stringify(payload)
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to a keepalive fetch when the beacon queue refuses", () => {
    const fetch = vi.fn(() => Promise.resolve());

    vi.stubGlobal("navigator", { sendBeacon: () => false });
    vi.stubGlobal("fetch", fetch);

    send("https://a.test/collect", payload);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];

    expect(url).toBe("https://a.test/collect");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(init.body).toBe(JSON.stringify(payload));
    // A declared content type would make every beacon a preflight plus a POST.
    expect(init.headers).toBeUndefined();
    /**
     * fetch defaults to `credentials: "same-origin"`, and a self-hosted install
     * serves the bundle off the site's own origin — so the default would attach
     * the host site's cookies to every beacon, from a script whose entire claim
     * is that it reads and writes no terminal equipment. sendBeacon has the same
     * default, but it carries no init to state it in; this path does.
     */
    expect(init.credentials).toBe("omit");
    expect(init.mode).toBe("cors");
  });

  it("falls back when sendBeacon is absent or throws", () => {
    const fetch = vi.fn(() => Promise.resolve());

    vi.stubGlobal("navigator", {});
    vi.stubGlobal("fetch", fetch);
    send("https://a.test/collect", payload);

    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("blocked by CSP");
      },
    });
    send("https://a.test/collect", payload);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  // An unhandled rejection is a message in the host page's console, which is
  // the one thing this script must never produce.
  it("attaches a handler to the fetch so a failure stays quiet", () => {
    const promise = { catch: vi.fn() };

    vi.stubGlobal("navigator", { sendBeacon: () => false });
    vi.stubGlobal("fetch", () => promise);

    send("https://a.test/collect", payload);

    expect(promise.catch).toHaveBeenCalled();
  });

  it("does not throw when there is no transport at all", () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("fetch", undefined);

    expect(() => send("https://a.test/collect", payload)).not.toThrow();
  });
});
