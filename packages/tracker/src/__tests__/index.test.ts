import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The tracker runs as it is imported, so every test builds the page it wants
 * first and imports second. What it leaves behind is a patched History and a
 * handful of listeners on globals the whole file shares, so both are recorded
 * on the way in and undone afterwards — otherwise the previous test's module is
 * still listening and every beacon arrives twice.
 */

type Beacon = { url: string; body: Record<string, unknown> };

const PUSH = history.pushState;
const REPLACE = history.replaceState;
const SRC = "https://cdn.example/aurora/tracker.js";
const COLLECT = "https://cdn.example/aurora/collect";
const DURATION = "https://cdn.example/aurora/collect/duration";

let beacons: Beacon[];
let fetched: unknown[][];
let clock: number;
let listeners: Array<[EventTarget, string, any, any]>;

const record = (target: EventTarget) => {
  const original = target.addEventListener.bind(target) as any;

  vi.spyOn(target as any, "addEventListener").mockImplementation(
    (...args: any[]) => {
      listeners.push([target, args[0], args[1], args[2]]);
      original(...args);
    }
  );
};

const tick = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

/** Moves the url without going through the patch the tracker installed. */
const at = (url: string) => REPLACE.call(history, null, "", url);

const visibility = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
};

const prerendering = (value: boolean) => {
  Object.defineProperty(document, "prerendering", {
    value,
    configurable: true,
  });
};

/**
 * The settle window the correction rule measures against opens at the load
 * event, so all three states have to be drivable: `loading` is a document whose
 * app bundle has not arrived yet, `complete` plus a `load` event is one that
 * has, and `interactive` is one that never will — a finished, readable page
 * held off "complete" by a single stalled subresource.
 */
const readyState = (state: "loading" | "interactive" | "complete") => {
  Object.defineProperty(document, "readyState", {
    value: state,
    configurable: true,
  });
};

const loaded = () => {
  readyState("complete");
  window.dispatchEvent(new Event("load"));
};

/** A gesture, seen the way the tracker sees one: capture phase, on the way in. */
const tap = () => {
  window.dispatchEvent(new Event("pointerdown"));
};

const types = () => {
  document.body.dispatchEvent(new Event("keydown", { bubbles: true }));
};

/** A router that assigns `location.hash`, or an `<a href="#/orders">`. */
const hashed = () => {
  window.dispatchEvent(new HashChangeEvent("hashchange"));
};

/**
 * A genuine `navigator.userAgentData`, GREASE and all. Chromium pads both brand
 * lists with a randomised "Not A Brand" entry specifically so servers cannot
 * match them literally, and `model`, `architecture` and the rest are what a
 * caller that asked for everything would be handed.
 */
const HIGH_ENTROPY = {
  brands: [
    { brand: "Not)A;Brand", version: "8" },
    { brand: "Chromium", version: "139" },
    { brand: "Google Chrome", version: "139" },
  ],
  fullVersionList: [
    { brand: "Not)A;Brand", version: "8.0.0.0" },
    { brand: "Chromium", version: "139.0.7258.67" },
    { brand: "Google Chrome", version: "139.0.7258.67" },
  ],
  mobile: false,
  platform: "Windows",
  platformVersion: "15.0.0",
  architecture: "x86",
  bitness: "64",
  model: "",
  uaFullVersion: "139.0.7258.67",
  wow64: false,
};

const hinting = (
  getHighEntropyValues: (hints: string[]) => unknown,
  values: Record<string, unknown> = HIGH_ENTROPY
) => {
  vi.stubGlobal("navigator", {
    ...navigator,
    userAgentData: {
      brands: values.brands,
      mobile: values.mobile,
      platform: values.platform,
      getHighEntropyValues,
    },
  });
};

const answering = (values: Record<string, unknown> = HIGH_ENTROPY) => {
  hinting(() => Promise.resolve(values), values);
};

/** jsdom has no referrer and no way to arrive at a page carrying one. */
const referrer = (value: string) => {
  Object.defineProperty(document, "referrer", {
    value,
    configurable: true,
  });
};

const load = async (
  attributes: { id?: string | null; src?: string | null } = {}
) => {
  const { id = "wid_test", src = SRC } = attributes;
  const script = document.createElement("script");

  if (id !== null) {
    script.setAttribute("aurora-id", id);
  }

  if (src !== null) {
    script.setAttribute("src", src);
  }

  document.head.append(script);

  await import("../index");

  return script;
};

const pageviews = () => beacons.filter((beacon) => beacon.url === COLLECT);
const durations = () => beacons.filter((beacon) => beacon.url === DURATION);

/** A pageview beacon that repairs a row rather than opening one. */
const corrections = () =>
  pageviews().filter((beacon) => beacon.body.corrects === true);

/**
 * The rows the events table would be holding, replayed the way /collect writes
 * them: a pageview inserts under its token, a correction UPDATEs the row that
 * token already names and inserts nothing. One entry here is one row in the
 * pages breakdown and one contribution to the visit count.
 */
const rows = () => {
  const written = new Map<string, string>();

  for (const beacon of pageviews()) {
    if (beacon.body.type !== "pageview") {
      continue;
    }

    const vid = beacon.body.vid as string;

    if (beacon.body.corrects) {
      if (written.has(vid)) {
        written.set(vid, beacon.body.path as string);
      }

      continue;
    }

    written.set(vid, beacon.body.path as string);
  }

  return [...written.values()];
};

beforeEach(() => {
  beacons = [];
  fetched = [];
  listeners = [];
  clock = 0;

  vi.stubGlobal("navigator", {
    language: "en-US",
    doNotTrack: null,
    sendBeacon: (url: string, body: string) => {
      beacons.push({ url, body: JSON.parse(body) });
      return true;
    },
  });

  vi.stubGlobal("fetch", (...args: unknown[]) => {
    fetched.push(args);
    return Promise.resolve();
  });

  vi.stubGlobal("screen", { width: 1920 });
  vi.spyOn(performance, "now").mockImplementation(() => clock);

  record(window);
  record(document);

  document.head.innerHTML = "";
  at("/");
  visibility("visible");
  // Pinned rather than left to jsdom: it is one half of the anchor the
  // correction rule measures its window from.
  readyState("complete");
  vi.resetModules();
});

afterEach(() => {
  for (const [target, type, listener, options] of listeners) {
    target.removeEventListener(type, listener, options);
  }

  history.pushState = PUSH;
  history.replaceState = REPLACE;

  delete (window as any).aurora;
  delete (document as any).visibilityState;
  delete (document as any).prerendering;
  delete (document as any).readyState;
  delete (document as any).currentScript;
  delete (document as any).referrer;

  document.head.innerHTML = "";

  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("bootstrap", () => {
  it("sends one pageview for the current path", async () => {
    at("/pricing");

    await load();

    expect(pageviews()).toHaveLength(1);
    expect(pageviews()[0]?.body).toMatchObject({
      wid: "wid_test",
      type: "pageview",
      path: "/pricing",
      language: "en-US",
      screen: 1920,
    });
    expect(pageviews()[0]?.body.vid).toEqual(expect.any(String));
  });

  it("keeps the endpoints under the src's own sub-path", async () => {
    await load({ src: "/assets/aurora.min.js" });

    expect(beacons[0]?.url).toBe(`${location.origin}/assets/collect`);
  });

  it("omits the fields the page cannot supply and the one with no column", async () => {
    await load();

    const body = pageviews()[0]?.body ?? {};

    // jsdom has no referrer, and every optional field is `.optional()` rather
    // than `.nullish()` server-side: an omitted key, never a null.
    expect(body).not.toHaveProperty("referrer");
    expect(body).not.toHaveProperty("viewport");
    expect(body).not.toHaveProperty("utm");
  });

  it("carries the campaign off the landing url", async () => {
    at("/?utm_source=hn&utm_medium=social&ref=x");

    await load();

    expect(pageviews()[0]?.body.utm).toEqual({
      source: "hn",
      medium: "social",
    });
  });

  it("writes nothing to any client-side storage", async () => {
    await load();

    history.pushState(null, "", "/b");
    await tick();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
  });

  it("prefers currentScript over the query when a page has two tags", async () => {
    const other = document.createElement("script");

    other.setAttribute("aurora-id", "wid_first");
    other.setAttribute("src", SRC);
    document.head.append(other);

    const script = document.createElement("script");

    script.setAttribute("aurora-id", "wid_current");
    script.setAttribute("src", SRC);
    document.head.append(script);

    Object.defineProperty(document, "currentScript", {
      value: script,
      configurable: true,
    });

    await import("../index");

    expect(pageviews()[0]?.body.wid).toBe("wid_current");
  });
});

describe("refusals", () => {
  /**
   * What a refusal looks like from the host page: no request, no History
   * patch, and a global that is still callable — a page must not take a
   * TypeError for a decision the visitor or the deployment made.
   */
  const INERT = { sent: 0, patched: false, api: "function" };

  const settle = async () => {
    window.aurora?.("signup");
    history.pushState(null, "", "/moved");

    await tick();

    return {
      sent: beacons.length,
      patched: history.pushState !== PUSH || history.replaceState !== REPLACE,
      api: typeof window.aurora,
    };
  };

  it("does nothing when the page carries no aurora script", async () => {
    await import("../index");

    expect(await settle()).toEqual(INERT);
    expect(listeners).toHaveLength(0);
  });

  it("does nothing when the tag has no id", async () => {
    await load({ id: null });

    expect(await settle()).toEqual(INERT);
  });

  it("does nothing when the tag has no src to resolve an endpoint from", async () => {
    await load({ src: null });

    expect(await settle()).toEqual(INERT);
  });

  it("respects doNotTrack", async () => {
    vi.stubGlobal("navigator", { ...navigator, doNotTrack: "1" });

    await load();

    expect(await settle()).toEqual(INERT);
  });

  it("respects globalPrivacyControl", async () => {
    vi.stubGlobal("navigator", { ...navigator, globalPrivacyControl: true });

    await load();

    expect(await settle()).toEqual(INERT);
  });

  it("drains the stub queue even when it refuses to send", async () => {
    (window as any).aurora = Object.assign(() => {}, { q: [["signup"]] });
    vi.stubGlobal("navigator", { ...navigator, doNotTrack: "1" });

    await load();

    expect(beacons).toHaveLength(0);
    expect(window.aurora?.q).toBeUndefined();
  });
});

describe("prerendering", () => {
  it("sends nothing until the prerender is activated", async () => {
    prerendering(true);

    await load();

    expect(beacons).toHaveLength(0);

    prerendering(false);
    document.dispatchEvent(new Event("prerenderingchange"));

    expect(pageviews()).toHaveLength(1);
  });

  it("holds an aurora() call made during the prerender", async () => {
    prerendering(true);

    await load();

    window.aurora?.("signup");

    expect(beacons).toHaveLength(0);

    prerendering(false);
    document.dispatchEvent(new Event("prerenderingchange"));

    expect(pageviews()).toHaveLength(2);
    expect(pageviews()[1]?.body).toMatchObject({
      type: "event",
      name: "signup",
    });
  });

  /**
   * The one case the two mechanisms share. A prerender can be activated into a
   * tab that is not on screen — the visitor middle-clicked the link Chrome had
   * prerendered — and the visibility check that used to sit in `boot` turned
   * that into a document that had refused the prerender's activation as well.
   */
  it("activates a prerender announced into a hidden tab, and still defers", async () => {
    prerendering(true);
    visibility("hidden");

    await load();

    prerendering(false);
    document.dispatchEvent(new Event("prerenderingchange"));

    expect(beacons).toHaveLength(0);
    // Activated for real: the hooks are in place, waiting for the tab.
    expect(history.pushState).not.toBe(PUSH);

    at("/deferred");
    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(rows()).toEqual(["/deferred"]);
  });

  /**
   * `{ once: true }` on the listener and the cleared `pending` queue each hide
   * the other: with only one of them in place a second announcement is still
   * silent, and with neither, every held call is sent twice and every listener
   * is registered twice.
   */
  it("activates once, however many times the prerender is announced", async () => {
    prerendering(true);

    await load();

    window.aurora?.("signup");

    prerendering(false);
    document.dispatchEvent(new Event("prerenderingchange"));
    document.dispatchEvent(new Event("prerenderingchange"));

    expect(pageviews()).toHaveLength(2);
    expect(
      pageviews().filter((beacon) => beacon.body.name === "signup")
    ).toHaveLength(1);
  });
});

describe("navigation", () => {
  it("reads location after pushState rather than the url argument", async () => {
    await load();

    history.pushState({ n: 1 }, "", "/docs/install?from=nav#top");
    await tick();

    expect(pageviews()).toHaveLength(2);
    expect(pageviews()[1]?.body.path).toBe("/docs/install");
    expect(location.pathname).toBe("/docs/install");
  });

  it("ignores a pushState that did not move the page", async () => {
    await load();

    // The call the old code tracked verbatim, url argument and all.
    history.pushState({ n: 1 }, "");
    await tick();

    expect(pageviews()).toHaveLength(1);
  });

  it("tracks a replaceState the visitor asked for", async () => {
    await load();

    // A router that replaces rather than pushes — a tab strip, a wizard step,
    // a filter that owns the URL. The gesture is what separates it from a
    // redirect the app issued on its own; see the mount redirects below.
    tap();
    history.replaceState(null, "", "/b");
    await tick();

    expect(rows()).toEqual(["/", "/b"]);
    expect(pageviews()[1]?.body.vid).not.toBe(pageviews()[0]?.body.vid);
    expect(corrections()).toHaveLength(0);
  });

  it("collapses a burst of replaceState into one view", async () => {
    await load();

    types();
    history.replaceState(null, "", "/list?q=a");
    history.replaceState(null, "", "/list?q=ab");
    history.replaceState(null, "", "/list?q=abc");
    await tick();

    expect(pageviews()).toHaveLength(2);
    expect(pageviews()[1]?.body.path).toBe("/list");
  });

  it("tracks a back navigation", async () => {
    await load();

    history.pushState(null, "", "/b");
    await tick();

    at("/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await tick();

    expect(pageviews().map((beacon) => beacon.body.path)).toEqual([
      "/",
      "/b",
      "/",
    ]);
  });

  it("does not count a hash change as a new page", async () => {
    await load();

    at("/#section");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await tick();

    expect(pageviews()).toHaveLength(1);
  });

  it("moves the settled hash, not the url the router was handed", async () => {
    await load();

    // What `createHashRouter` does: the hash is moved through pushState, so
    // this is the patch's path and not the listener's.
    history.pushState(null, "", "/#/orders?page=2");
    await tick();

    expect(pageviews()[1]?.body.path).toBe("/#/orders");
  });

  it("collapses a trailing slash so one page is one row", async () => {
    await load();

    history.pushState(null, "", "/docs/");
    await tick();
    history.pushState(null, "", "/docs");
    await tick();

    expect(pageviews()).toHaveLength(2);
    expect(pageviews()[1]?.body.path).toBe("/docs");
  });

  it("mints a fresh token per view, since a repeat is silently dropped", async () => {
    await load();

    history.pushState(null, "", "/b");
    await tick();

    const [first, second] = pageviews();

    expect(second?.body.vid).not.toBe(first?.body.vid);
  });
});

/**
 * A hash-routed app — Vue Router's hash mode, Angular's HashLocationStrategy,
 * `createHashRouter`, or anything on a static host that cannot serve a rewrite
 * — used to report one row per site, always `/`, one pageview per document
 * however deep the visit went, and a bounce on every visit, because the second
 * pageview that clears it never existed. The listener below was removed once as
 * provably dead, and it was: `view()` compares paths, and every hash was the
 * same path until /collect started keeping a route-shaped fragment.
 */
describe("hash routing", () => {
  it("counts a hash route as the page it is", async () => {
    await load();

    at("/#/settings");
    hashed();
    await tick();

    expect(rows()).toEqual(["/", "/#/settings"]);
    // A real navigation, so a real token: without one the duration beacon and
    // the bounce clear both address the wrong row.
    expect(pageviews()[1]?.body.vid).not.toBe(pageviews()[0]?.body.vid);
  });

  it("behaves exactly like a pushState, correction window included", async () => {
    await load();

    // Inside the settle window and with no gesture, which is what makes a
    // `replaceState` a mount correction. A hash moved because something asked
    // it to, so this is a navigation whatever the clock says.
    clock = 20;
    at("/#/dashboard");
    hashed();
    await tick();

    expect(rows()).toEqual(["/", "/#/dashboard"]);
    expect(corrections()).toHaveLength(0);
  });

  it("collapses the boot rewrite from / to /#/", async () => {
    await load();

    at("/#/");
    hashed();
    await tick();

    // The router's root is the page `/` already names. Nothing moved.
    expect(pageviews()).toHaveLength(1);
  });

  it("spends one view on a back navigation that fires both events", async () => {
    await load();

    at("/#/a");
    hashed();
    await tick();

    // Back across two hash entries fires popstate and hashchange both, and only
    // the coalescing in `schedule` makes that pair one view.
    at("/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    hashed();
    await tick();

    expect(pageviews().map((beacon) => beacon.body.path)).toEqual([
      "/",
      "/#/a",
      "/",
    ]);
  });

  it("leaves the route's own query alone", async () => {
    at("/#/search");

    await load();

    types();
    at("/#/search?q=a");
    hashed();
    at("/#/search?q=ab");
    hashed();
    await tick();

    // A search box owning the URL is not three pages, exactly as it is not on
    // the pathname side.
    expect(beacons).toHaveLength(1);
  });

  it("bills each hash route the time it was on screen", async () => {
    await load();

    const first = pageviews()[0]?.body.vid;

    clock = 12_000;
    at("/#/a");
    hashed();
    await tick();

    clock = 20_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(durations().map((beacon) => beacon.body)).toEqual([
      { wid: "wid_test", vid: first, duration: 12_000 },
      { wid: "wid_test", vid: pageviews()[1]?.body.vid, duration: 8_000 },
    ]);
  });

  /**
   * The reason the rule is `#/` and nothing looser. OAuth implicit-flow and
   * magic-link callbacks put bearer tokens in the fragment, and `path` is
   * unbounded text rendered in a dashboard panel.
   */
  it("never puts a fragment carrying a secret on the wire", async () => {
    await load();

    at("/callback#access_token=ya29.a0AeXRPp&refresh_token=1%2F%2F0e");
    hashed();
    await tick();

    expect(rows()).toEqual(["/", "/callback"]);
    expect(JSON.stringify(beacons)).not.toContain("access_token");
  });

  it("holds a hash route the tab was not looking at", async () => {
    await load();

    clock = 5_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    at("/#/a");
    hashed();
    await tick();
    at("/#/b");
    hashed();
    await tick();

    expect(pageviews()).toHaveLength(1);

    clock = 60_000;
    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(rows()).toEqual(["/", "/#/b"]);
  });
});

describe("duration", () => {
  it("attributes each page's time to that page's own token", async () => {
    await load();

    const first = pageviews()[0]?.body.vid;

    clock = 60_000;
    history.pushState(null, "", "/b");
    await tick();

    const second = pageviews()[1]?.body.vid;

    clock = 90_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(durations().map((beacon) => beacon.body)).toEqual([
      { wid: "wid_test", vid: first, duration: 60_000 },
      { wid: "wid_test", vid: second, duration: 30_000 },
    ]);
  });

  it("flushes the leaving page before the arriving one is announced", async () => {
    await load();

    clock = 5_000;
    history.pushState(null, "", "/b");
    await tick();

    expect(beacons.map((beacon) => beacon.url)).toEqual([
      COLLECT,
      DURATION,
      COLLECT,
    ]);
  });

  it("does not count time spent in a background tab", async () => {
    await load();

    clock = 10_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    clock = 400_000;
    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    clock = 405_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(durations().map((beacon) => beacon.body.duration)).toEqual([
      10_000, 15_000,
    ]);
  });

  it("flushes on pagehide as well, and spends one beacon doing it", async () => {
    await load();

    clock = 7_000;
    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    expect(durations()).toHaveLength(1);
    expect(durations()[0]?.body.duration).toBe(7_000);

    // Browsers that fire both must not cost two requests against a limiter
    // that is per IP and shared with /collect.
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(durations()).toHaveLength(1);
  });

  it("never reports a view that lasted no measurable time", async () => {
    await load();

    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    expect(durations()).toHaveLength(0);
  });

  it("starts a fresh view and a fresh timer on a bfcache restore", async () => {
    await load();

    clock = 5_000;
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true })
    );

    expect(pageviews()).toHaveLength(2);

    const revisit = pageviews()[1]?.body.vid;

    expect(revisit).not.toBe(pageviews()[0]?.body.vid);

    clock = 8_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    // 3s on the restored view, not the 8s the document has been alive.
    expect(durations()[1]?.body).toMatchObject({
      vid: revisit,
      duration: 3_000,
    });
  });

  it("ignores a pageshow that is not a restore", async () => {
    await load();

    window.dispatchEvent(new PageTransitionEvent("pageshow"));

    expect(pageviews()).toHaveLength(1);
  });
});

describe("window.aurora", () => {
  it("sends a custom event against the current view", async () => {
    at("/checkout");

    await load();

    window.aurora?.("purchase", {
      props: { plan: "pro" },
      revenue: { amount: 49, currency: "eur" },
    });

    expect(pageviews()[1]?.body).toEqual({
      wid: "wid_test",
      type: "event",
      name: "purchase",
      vid: pageviews()[0]?.body.vid,
      path: "/checkout",
      props: { plan: "pro" },
      revenue: { amount: 49, currency: "eur" },
    });
  });

  it("drains calls the async stub queued before the bundle landed", async () => {
    (window as any).aurora = Object.assign(() => {}, {
      q: [["signup", { props: { plan: "free" } }], ["viewed_pricing"]],
    });

    await load();

    expect(pageviews().map((beacon) => beacon.body.name)).toEqual([
      undefined,
      "signup",
      "viewed_pricing",
    ]);
    expect(window.aurora?.q).toBeUndefined();
  });

  it("drops the properties the schema would reject, not the event", async () => {
    await load();

    window.aurora?.("signup", {
      props: { plan: "pro", team: null, tags: [1] } as any,
      revenue: { amount: 10 } as any,
    });

    expect(pageviews()[1]?.body).toMatchObject({
      name: "signup",
      props: { plan: "pro" },
    });
    expect(pageviews()[1]?.body).not.toHaveProperty("revenue");
  });

  it("sends nothing for a call the server would reject outright", async () => {
    await load();

    window.aurora?.("");
    (window.aurora as any)?.();
    (window.aurora as any)?.(42);

    expect(pageviews()).toHaveLength(1);
  });

  it("follows the view, so an event names the page it happened on", async () => {
    await load();

    history.pushState(null, "", "/thanks");
    await tick();

    window.aurora?.("purchase");

    expect(pageviews()[2]?.body).toMatchObject({
      path: "/thanks",
      vid: pageviews()[1]?.body.vid,
    });
  });
});

describe("host page safety", () => {
  it("keeps history working for the page it is patched into", async () => {
    await load();

    history.pushState({ step: 2 }, "", "/checkout/payment");

    expect(location.pathname).toBe("/checkout/payment");
    expect(history.state).toEqual({ step: 2 });

    // Drained inside the test that armed it. The patched history schedules a
    // task, and afterEach can unregister a listener but not cancel a timer: a
    // navigation left pending here fires against the next test's beacon array,
    // from a module instance that test never loaded.
    await tick();
  });

  it("lets the page's own pushState error through untouched", async () => {
    await load();

    // A cross-origin url is a SecurityError the caller has to see.
    expect(() =>
      history.pushState(null, "", "https://elsewhere.test/")
    ).toThrow(/cannot update history/);
  });

  it("does not run twice when the page carries the bundle twice", async () => {
    await load();

    // A tag-manager injection landing on top of a hardcoded snippet. Both
    // copies see the same tag, and the second used to wrap the first's patched
    // history and mint its own token for every view.
    vi.resetModules();
    await import("../index");

    history.pushState(null, "", "/b");
    await tick();

    expect(pageviews().map((beacon) => beacon.body.path)).toEqual(["/", "/b"]);
  });

  it("surfaces nothing when every transport is broken", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon: () => {
        throw new Error("blocked");
      },
    });
    vi.stubGlobal("fetch", () => {
      throw new Error("blocked");
    });

    await expect(load()).resolves.toBeDefined();

    expect(() => history.pushState(null, "", "/b")).not.toThrow();
    expect(() => window.aurora?.("signup")).not.toThrow();
    expect(() =>
      window.dispatchEvent(new PageTransitionEvent("pagehide"))
    ).not.toThrow();

    await tick();
  });
});

describe("background tabs", () => {
  /**
   * A tab opened in the background is a visit, not a prerender: cmd-click,
   * middle-click, "open link in new tab", a minimised window, or simply a load
   * that finished after the visitor tabbed away — which on a slow connection is
   * the ordinary case, since this file is a third-party script that lands late.
   * The document used to be refused outright here, taking every `aurora()` call
   * with it.
   */
  it("records a background tab the visitor opens, against the route it settled on", async () => {
    referrer("https://news.ycombinator.com/item?id=1");
    visibility("hidden");

    await load();

    expect(beacons).toHaveLength(0);
    // Activated, unlike before: the hooks are the whole point of deferring
    // rather than refusing.
    expect(history.pushState).not.toBe(PUSH);

    // The tab settles while nobody is looking. None of it is a pageview.
    clock = 30_000;
    history.pushState(null, "", "/onboarding");
    await tick();

    expect(beacons).toHaveLength(0);

    clock = 60_000;
    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(rows()).toEqual(["/onboarding"]);
    // One arrival, credited to the place it came from: `landed` is still false
    // when the held view is finally recorded.
    expect(pageviews()[0]?.body.referrer).toBe("https://news.ycombinator.com");

    clock = 70_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    // Ten seconds on screen, not the seventy the document has been alive.
    expect(durations().map((beacon) => beacon.body.duration)).toEqual([10_000]);
  });

  it("sends nothing at all for a background tab that is never opened", async () => {
    visibility("hidden");

    await load();

    history.pushState(null, "", "/b");
    await tick();
    history.replaceState(null, "", "/c");
    await tick();

    clock = 1_800_000;
    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    // Not one beacon, not even a duration: the view was never opened, so there
    // is no token to time and nothing to report against it.
    expect(beacons).toHaveLength(0);
  });

  /**
   * The defect the old refusal hid. `install(api)` drains the stub's queue into
   * `pending` before `boot` runs, and the drain used to happen at the end of
   * `activate()` — with no view, so `event()` rejected every held call and the
   * queue was emptied behind it. A `revenue` conversion fired from the page head
   * of a backgrounded tab was destroyed rather than delayed.
   */
  it("holds a queued call until the tab has a view to name it", async () => {
    (window as any).aurora = Object.assign(() => {}, {
      q: [["purchase", { revenue: { amount: 49, currency: "eur" } }]],
    });

    visibility("hidden");
    at("/checkout");

    await load();

    expect(beacons).toHaveLength(0);

    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(pageviews()).toHaveLength(2);
    expect(pageviews()[1]?.body).toMatchObject({
      type: "event",
      name: "purchase",
      path: "/checkout",
      vid: pageviews()[0]?.body.vid,
      revenue: { amount: 49, currency: "eur" },
    });
  });

  /**
   * The symmetric half of the test above, which was still broken. That one
   * covers a call made *before* the bundle landed; this is one made *after* the
   * document has fully activated, in a tab that is still hidden. `ready` is
   * true by then, so it walked past `api`'s queue and into `event()`'s
   * `!vid || !path` return and was destroyed — the conversion and its revenue
   * gone permanently, with the deferred pageview arriving later as if nothing
   * had happened.
   */
  it("holds a call made after activation in a still-hidden tab", async () => {
    visibility("hidden");
    at("/checkout");

    await load();

    window.aurora?.("newsletter_signup", {
      revenue: { amount: 5, currency: "usd" },
    });

    expect(beacons).toHaveLength(0);

    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(pageviews()).toHaveLength(2);
    expect(pageviews()[1]?.body).toMatchObject({
      type: "event",
      name: "newsletter_signup",
      path: "/checkout",
      vid: pageviews()[0]?.body.vid,
      revenue: { amount: 5, currency: "usd" },
    });
  });

  /**
   * The queue `view()` drains is only emptied by a view happening, so a tab that
   * never comes forward fills it for the life of the document. Bounded at 32 so
   * a heartbeat event on a timer cannot grow it without limit on somebody
   * else's page.
   */
  it("bounds the held queue rather than growing it in a tab nobody opens", async () => {
    visibility("hidden");
    at("/dashboard");

    await load();

    for (let i = 0; i < 100; i += 1) {
      window.aurora?.(`heartbeat_${i}`);
    }

    expect(beacons).toHaveLength(0);

    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    // One pageview plus the 32 that were held; the rest were dropped as they
    // were made rather than retained.
    expect(pageviews()).toHaveLength(33);
    expect(pageviews()[1]?.body.name).toBe("heartbeat_0");
    expect(pageviews()[32]?.body.name).toBe("heartbeat_31");
  });

  it("records a bfcache restore into a hidden tab when the tab comes back", async () => {
    await load();

    clock = 5_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    // Restored underneath the visitor — a back navigation in another window
    // brought this document back while its tab was still in the background.
    at("/restored");
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true })
    );

    expect(rows()).toEqual(["/"]);

    clock = 20_000;
    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(rows()).toEqual(["/", "/restored"]);

    clock = 25_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    // 5s on the first view and 5s on the restored one: none of the fifteen
    // seconds the document spent in the background is billed to either.
    expect(durations().map((beacon) => beacon.body.duration)).toEqual([
      5_000, 5_000,
    ]);
  });

  /**
   * The tab is hidden, the router keeps going, and nobody is looking. Every
   * one of those routes used to be a pageview — a row in the pages breakdown,
   * a cleared bounce for the session, and a slot of a rate limit shared with
   * the beacons that pay for it.
   */
  it("holds a background navigation until the tab is looked at", async () => {
    await load();

    clock = 10_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    history.pushState(null, "", "/b");
    await tick();
    history.pushState(null, "", "/c");
    await tick();

    expect(pageviews()).toHaveLength(1);

    clock = 600_000;
    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    // One view, for the route the tab actually settled on.
    expect(pageviews().map((beacon) => beacon.body.path)).toEqual(["/", "/c"]);

    clock = 610_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(durations().map((beacon) => beacon.body.duration)).toEqual([
      10_000, 10_000,
    ]);
  });

  it("books no duration for a view that was never on screen", async () => {
    await load();

    clock = 10_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    clock = 60_000;
    history.pushState(null, "", "/b");
    await tick();

    // Twenty minutes in the background and then discarded. The timer used to
    // start with the view, so /b was billed all of it.
    clock = 1_260_000;
    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    expect(pageviews()).toHaveLength(1);
    expect(durations().map((beacon) => beacon.body.duration)).toEqual([10_000]);
  });

  /**
   * The half of the deferral this listener cannot decide on its own. Every
   * other test in this file drains the pending navigation before flipping the
   * tab, which is the order a foreground tab always gets; a hidden one never
   * does. Browsers clamp `setTimeout` in a background tab to one a second, and
   * Chrome to one a *minute* past five minutes hidden, so the task `schedule()`
   * deferred cannot run until the tab is foregrounded and `visibilitychange`
   * arrives first every time.
   */
  it("lets the pending navigation decide, rather than racing it to a row", async () => {
    await load();

    clock = 200;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    // The auth guard fires while nobody is looking. Deliberately not drained:
    // the timer is still throttled at this point.
    clock = 400;
    history.replaceState(null, "", "/login");

    clock = 700;
    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    await tick();

    // One arrival, one row, and it names the page the visitor is looking at.
    // Deciding here instead booked a second view for `/login` and left the
    // correction with nothing to move — two rows, the second under `direct`.
    expect(rows()).toEqual(["/login"]);
    expect(corrections()).toHaveLength(1);
    expect(pageviews().filter((beacon) => !beacon.body.corrects)).toHaveLength(
      1
    );
  });

  it("sends no event for a view it is still holding back", async () => {
    await load();

    clock = 5_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    // A bfcache restore into a background tab: the view is reset and held, so
    // there is no path to name and `path` is `min(1)` server-side.
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true })
    );

    const before = beacons.length;

    window.aurora?.("signup");

    expect(beacons).toHaveLength(before);
  });
});

/**
 * A router that rewrites the URL while its first route settles — an auth guard,
 * a locale prefix, a boot redirect — used to book a second pageview a few dozen
 * milliseconds after the first. That is two rows for one arrival, a phantom row
 * for a path nobody read, and, because the second view retroactively clears the
 * session's bounce, a structural bounce rate of zero for every site that does
 * it. The second beacon also carried no referrer, so the row holding the path
 * the visitor actually landed on was filed under `direct`.
 *
 * The rule that separates the two is in `correcting()`: a `replaceState`, with
 * no gesture and no custom event against the view it is replacing, inside a
 * window that opens when the document finishes loading.
 */
describe("mount redirects", () => {
  it("books one pageview for an auth guard's redirect", async () => {
    await load();

    const opening = pageviews()[0]?.body.vid;

    // Where a React mount redirect lands: past any "no measurable time" floor,
    // and long before the visitor could have asked for anything.
    clock = 50;
    history.replaceState(null, "", "/login");
    await tick();

    expect(rows()).toEqual(["/login"]);
    expect(pageviews()[1]?.body).toEqual({
      wid: "wid_test",
      type: "pageview",
      vid: opening,
      path: "/login",
      corrects: true,
    });
  });

  it("leaves a single-page visit a bounce, and one visit", async () => {
    await load();

    clock = 50;
    history.replaceState(null, "", "/login");
    await tick();

    clock = 40_000;
    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    // One row is one visit: nothing here clears a bounce server-side, because
    // nothing here is a second pageview.
    expect(rows()).toHaveLength(1);
    expect(pageviews().filter((beacon) => !beacon.body.corrects)).toHaveLength(
      1
    );
    // And the visitor's time is still the view's own, undivided: the redirect
    // neither flushed the clock nor started a second one.
    expect(durations().map((beacon) => beacon.body)).toEqual([
      { wid: "wid_test", vid: pageviews()[0]?.body.vid, duration: 40_000 },
    ]);
  });

  it("keeps a locale prefix rewrite one page rather than two", async () => {
    at("/pricing");

    await load();

    clock = 20;
    history.replaceState(null, "", "/en/pricing");
    await tick();

    expect(rows()).toEqual(["/en/pricing"]);
  });

  it("follows a redirect chain without spending a row on each hop", async () => {
    await load();

    clock = 40;
    history.replaceState(null, "", "/login");
    await tick();

    clock = 90;
    history.replaceState(null, "", "/login/sso");
    await tick();

    expect(rows()).toEqual(["/login/sso"]);
    expect(corrections()).toHaveLength(2);
  });

  it("corrects the view a click opened rather than the click's own page", async () => {
    await load();

    // The visitor clicks through to a guarded route: the gesture belongs to the
    // pushState, and the redirect that follows belongs to the view it opened.
    clock = 8_000;
    tap();
    history.pushState(null, "", "/admin");
    await tick();

    clock = 8_008;
    history.replaceState(null, "", "/login");
    await tick();

    expect(rows()).toEqual(["/", "/login"]);
    expect(corrections()[0]?.body.vid).toBe(pageviews()[1]?.body.vid);
  });

  it("never reads a pushState as a correction, however fast it lands", async () => {
    await load();

    clock = 3;
    history.pushState(null, "", "/dashboard");
    await tick();

    expect(rows()).toEqual(["/", "/dashboard"]);
    expect(corrections()).toHaveLength(0);
  });

  it("never reads a burst containing a push as a correction", async () => {
    await load();

    // A router that pushes the route and then replaces the URL to normalise it
    // has navigated, and the coalescing must not lose that.
    clock = 5;
    history.pushState(null, "", "/docs");
    history.replaceState(null, "", "/docs/install");
    await tick();

    expect(rows()).toEqual(["/", "/docs/install"]);
    expect(corrections()).toHaveLength(0);
  });

  it("books a genuine replaceState navigation once the window has closed", async () => {
    loaded();

    await load();

    // Seconds later, with nothing else to say it was the visitor's doing: a
    // slideshow advancing, a wizard stepping itself, a poll routing on data.
    clock = 4_000;
    history.replaceState(null, "", "/step-2");
    await tick();

    expect(rows()).toEqual(["/", "/step-2"]);
    expect(corrections()).toHaveLength(0);
    // A real second view, which means the leaving one is billed on its way out.
    expect(durations()[0]?.body).toMatchObject({
      vid: pageviews()[0]?.body.vid,
      duration: 4_000,
    });
  });

  it("books a replaceState the visitor asked for inside the window", async () => {
    await load();

    clock = 40;
    tap();
    history.replaceState(null, "", "/b");
    await tick();

    expect(rows()).toEqual(["/", "/b"]);
  });

  it("leaves a search box alone, and stops correcting once it is typed in", async () => {
    at("/list");

    await load();

    // The query moves and the path does not: nothing to send either way.
    clock = 30;
    types();
    history.replaceState(null, "", "/list?q=a");
    history.replaceState(null, "", "/list?q=ab");
    history.replaceState(null, "", "/list?q=abc");
    await tick();

    expect(beacons).toHaveLength(1);

    // The same box, now routing to a result. The gesture is what makes it a
    // navigation even though the window is still open.
    clock = 60;
    history.replaceState(null, "", "/list/42");
    await tick();

    expect(rows()).toEqual(["/list", "/list/42"]);
    expect(corrections()).toHaveLength(0);
  });

  it("stops correcting a view the page has reported an event against", async () => {
    await load();

    clock = 20;
    window.aurora?.("signup");

    clock = 40;
    history.replaceState(null, "", "/thanks");
    await tick();

    // The page said something happened on that view, so the view was real.
    expect(rows()).toEqual(["/", "/thanks"]);
    expect(corrections()).toHaveLength(0);
  });

  /**
   * The measurement that set the window: the same `<Navigate replace>` mount
   * redirect lands 22ms after this script's first view unthrottled and 1703ms
   * after it on a throttled connection, because the difference is the app
   * bundle arriving. Anchored at the load event instead, both are within a few
   * dozen milliseconds of it.
   */
  it("still corrects a redirect from a bundle that took seconds to arrive", async () => {
    readyState("loading");

    await load();

    clock = 1_703;
    history.replaceState(null, "", "/login");
    await tick();

    expect(rows()).toEqual(["/login"]);
  });

  it("measures the window from the load event, not from the view", async () => {
    readyState("loading");

    await load();

    clock = 2_800;
    loaded();

    // 577ms past the load event is the slowest true positive measured: a guard
    // awaiting a 400ms /session call on a throttled connection.
    clock = 3_377;
    history.replaceState(null, "", "/login");
    await tick();

    expect(rows()).toEqual(["/login"]);
  });

  it("closes the window a second after the document has loaded", async () => {
    readyState("loading");

    await load();

    clock = 2_800;
    loaded();

    clock = 3_900;
    history.replaceState(null, "", "/login");
    await tick();

    expect(rows()).toEqual(["/", "/login"]);
    expect(corrections()).toHaveLength(0);
  });

  /**
   * The window a document that has not loaded yet gets is open by design —
   * "an app that has not run yet cannot have redirected yet" — and it used to
   * be open with no end at all. `readyState` only reaches "complete" once every
   * subresource has resolved, so a dead image host, a hanging ad iframe or a
   * font that never arrives leaves a perfectly readable page at "interactive"
   * for as long as it is open, and `load` never fires to close anything.
   */
  it("stops treating a document that never loads as one that is still loading", async () => {
    readyState("interactive");

    await load();

    clock = 30_000;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    // A background token refresh, ten minutes in. A hidden tab can produce no
    // gesture and this page has fired no custom event, so those two halves of
    // the rule can never falsify it and only the clock is left.
    clock = 630_000;
    history.replaceState(null, "", "/session/refresh");
    await tick();

    // The row still names the page the visitor spent thirty seconds reading.
    expect(rows()).toEqual(["/"]);
    expect(corrections()).toHaveLength(0);

    // And the beacon spend is bounded with it: every further rewrite from a tab
    // nobody is looking at is a POST against a per-IP limit shared with the
    // pageviews that pay for it.
    const spent = beacons.length;

    for (let step = 0; step < 5; step += 1) {
      clock += 60_000;
      history.replaceState(null, "", `/session/refresh/${step}`);
      await tick();
    }

    expect(beacons).toHaveLength(spent);
  });

  /**
   * A boot-time URL scrub — a consent or analytics script stripping `?fbclid`
   * or `?gclid` on mount, a router normalising a default query parameter — is
   * a no-gesture `replaceState` inside the window that does not move the page.
   * It satisfies every clause of the correction rule and there is nothing to
   * correct.
   */
  it("spends nothing correcting a rewrite that did not move the page", async () => {
    at("/?fbclid=IwAR0abc");

    await load();

    clock = 30;
    history.replaceState(null, "", "/");
    await tick();

    expect(beacons).toHaveLength(1);
    expect(corrections()).toHaveLength(0);
  });

  /**
   * The gesture listeners are the discriminator that survives an arbitrary
   * delay, and a bubbling listener would never see the gestures that matter
   * most: menu, dialog and dropdown primitives — Radix's, which this repo's own
   * dashboard is built out of — call `stopPropagation()` on `pointerdown` as a
   * matter of course. In the bubble phase the click never reaches `window`, and
   * the navigation the visitor asked for is swallowed as a mount correction.
   */
  it("sees a gesture the page stopped from propagating", async () => {
    await load();

    const item = document.createElement("button");

    document.body.append(item);
    item.addEventListener("pointerdown", (gesture) => {
      gesture.stopPropagation();
    });

    try {
      clock = 40;
      item.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      history.replaceState(null, "", "/menu/orders");
      await tick();

      expect(rows()).toEqual(["/", "/menu/orders"]);
      expect(corrections()).toHaveLength(0);
    } finally {
      item.remove();
    }
  });

  it("listens for those gestures passively, so it can never jank one", async () => {
    await load();

    const gestures = listeners.filter(
      ([target, type]) =>
        target === window &&
        ["pointerdown", "keydown", "touchstart"].includes(type)
    );

    expect(gestures).toHaveLength(3);

    for (const [, , , options] of gestures) {
      expect(options).toEqual({ capture: true, passive: true });
    }
  });

  /**
   * The async stub queues a call into `q` before the bundle has landed, so that
   * call was made before any view existed and says nothing about whether the
   * view that eventually arrives is real. Counting it as evidence disarmed the
   * whole rule for every site using the documented snippet.
   */
  it("does not let a call the stub queued stand in for the view's own", async () => {
    (window as any).aurora = Object.assign(() => {}, { q: [["identify"]] });

    await load();

    clock = 40;
    history.replaceState(null, "", "/login");
    await tick();

    expect(rows()).toEqual(["/login"]);
    expect(corrections()).toHaveLength(1);
  });

  it("repairs a row whose tab was backgrounded before the redirect landed", async () => {
    await load();

    clock = 200;
    visibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    clock = 400;
    history.replaceState(null, "", "/login");
    await tick();

    expect(rows()).toEqual(["/login"]);

    clock = 5_000;
    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    // Nothing left to record: the page the tab comes back to is the page the
    // row already names. Holding the repair back is what would have made this
    // a second view.
    expect(rows()).toEqual(["/login"]);
    expect(pageviews().filter((beacon) => !beacon.body.corrects)).toHaveLength(
      1
    );
  });

  it("holds a redirect in a hidden tab back rather than correcting it", async () => {
    visibility("hidden");

    await load();

    clock = 50;
    history.replaceState(null, "", "/login");
    await tick();

    expect(beacons).toHaveLength(0);

    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    // One view for the route the redirect settled on, and no correction: there
    // was never a row naming `/` to repair.
    expect(rows()).toEqual(["/login"]);
    expect(corrections()).toHaveLength(0);
  });
});

describe("acquisition", () => {
  it("sends the referrer's origin and not the path or query on it", async () => {
    referrer(
      "https://mail.example.com/inbox?email=jane.doe%40acme.com&token=sk_live_9f3a2b"
    );

    await load();

    // Only the host is ever stored, so the rest is a search phrase, a private
    // thread or a magic-link token crossing the network for nothing.
    expect(pageviews()[0]?.body.referrer).toBe("https://mail.example.com");
  });

  it("drops a referrer the server could not have stored anyway", async () => {
    referrer("android-app://com.google.android.gm/");

    await load();

    expect(pageviews()[0]?.body).not.toHaveProperty("referrer");
  });

  it("credits the arrival once and not once per page of the visit", async () => {
    referrer("https://news.ycombinator.com/item?id=1");

    await load();

    history.pushState(null, "", "/pricing");
    await tick();
    history.pushState(null, "", "/docs");
    await tick();

    // `document.referrer` never moves within a document, so re-reading it made
    // a four-page SPA visit four referrals where an MPA visit is one.
    expect(pageviews()[0]?.body.referrer).toBe("https://news.ycombinator.com");
    expect(pageviews()[1]?.body).not.toHaveProperty("referrer");
    expect(pageviews()[2]?.body).not.toHaveProperty("referrer");
  });

  /**
   * The referrer is snapshotted against a deferred view by `landed` and the
   * campaign was not, so the two disagreed about exactly one document: a
   * campaign link cmd-clicked, middle-clicked or opened into a background tab.
   * The view is held until the visitor looks at the tab, and by then the
   * router's mount rewrite has taken `?utm_source` off `location` — so the same
   * click reported `campaign` in the foreground and `direct` in the background.
   */
  it("keeps the campaign a deferred first view arrived on", async () => {
    at("/?utm_source=newsletter&utm_campaign=launch");
    visibility("hidden");

    await load();

    // The router normalising its URL on mount, with nobody looking yet.
    clock = 2_000;
    history.replaceState(null, "", "/");
    await tick();

    clock = 60_000;
    visibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(pageviews()).toHaveLength(1);
    expect(pageviews()[0]?.body.utm).toEqual({
      source: "newsletter",
      campaign: "launch",
    });
  });

  it("reads the campaign per view, since an SPA can route into one", async () => {
    await load();

    history.pushState(null, "", "/promo?utm_source=newsletter");
    await tick();

    expect(pageviews()[1]?.body.utm).toEqual({ source: "newsletter" });
  });
});

describe("payload bounds", () => {
  it("clamps a custom event name to what the schema accepts", async () => {
    await load();

    window.aurora?.("x".repeat(500));

    expect(pageviews()[1]?.body.name).toHaveLength(200);
  });

  it("clamps an over-long referrer rather than losing the pageview", async () => {
    referrer(`https://${"a".repeat(1200)}.example/`);

    await load();

    expect(pageviews()[0]?.body.referrer).toHaveLength(1024);
  });

  it("clamps an over-long language tag", async () => {
    vi.stubGlobal("navigator", { ...navigator, language: "en-GB-".repeat(40) });

    await load();

    expect(pageviews()[0]?.body.language).toHaveLength(64);
  });

  it("omits a screen width the column would store as null", async () => {
    vi.stubGlobal("screen", { width: 0 });

    await load();

    expect(pageviews()[0]?.body).not.toHaveProperty("screen");
  });

  it("clamps a duration to the range the check constraint allows", async () => {
    await load();

    // A tab left open for more than a day, or a clock that jumped.
    clock = 90_000_000;
    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    expect(durations()[0]?.body.duration).toBe(86_400_000);
  });
});

/**
 * `Accept-CH` cannot work on this origin — a browser stores the ask only from a
 * top-level navigation response, and the collector serves nothing but
 * third-party beacons — so `Sec-CH-UA-Platform-Version` never arrives and the
 * server falls back to a UA string that UA reduction has frozen: every Chromium
 * Mac permanently "10", Windows 11 indistinguishable from 10, every Android
 * "10". `getHighEntropyValues` reads the same value out of the browser
 * in-process, with no header negotiation to fail.
 */
describe("client hints", () => {
  it("sends nothing at all on a browser that has no userAgentData", async () => {
    // Safari and Firefox, and every insecure context. This is the whole
    // population that must be unchanged by any of it.
    await load();

    history.pushState(null, "", "/b");
    await tick();

    expect(pageviews()).toHaveLength(2);

    for (const beacon of pageviews()) {
      expect(beacon.body).not.toHaveProperty("platformVersion");
    }
  });

  it("carries the platform version once the browser has answered", async () => {
    answering();

    await load();
    await tick();

    history.pushState(null, "", "/b");
    await tick();

    // Raw, not reduced: on Windows the platform version is an index into a
    // table Microsoft publishes — 15 is the release 11 — and only the server
    // holds that table.
    expect(pageviews()[1]?.body.platformVersion).toBe("15.0.0");
  });

  it("names the view it belongs to, events included", async () => {
    answering();

    await load();
    await tick();

    window.aurora?.("signup");

    expect(pageviews()[1]?.body).toMatchObject({
      type: "event",
      name: "signup",
      platformVersion: "15.0.0",
    });
  });

  it("sends the first view without waiting for the promise", async () => {
    let answer: ((values: unknown) => void) | undefined;

    hinting(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        })
    );

    await load();
    await tick();

    // The view a fast bounce depends on went out on its own task, with the
    // frozen answer the UA string gives and no hint at all.
    expect(pageviews()).toHaveLength(1);
    expect(pageviews()[0]?.body).not.toHaveProperty("platformVersion");

    answer?.({ ...HIGH_ENTROPY, platformVersion: "14.6.1" });
    await tick();

    history.pushState(null, "", "/b");
    await tick();

    expect(pageviews()[1]?.body.platformVersion).toBe("14.6.1");
  });

  /**
   * The ask itself, and not only what survives it. Everything else
   * `getHighEntropyValues` can return is entropy this file has no column for —
   * `model` settles a question `?0` plus the platform already settles,
   * `fullVersionList` is reduced to a major server-side, and `architecture`,
   * `bitness` and `wow64` have nowhere at all to go — so a widened ask is a
   * widened fingerprinting surface that the beacon assertions below cannot see,
   * because the extra values would be fetched and then dropped.
   */
  it("asks for the one hint it has a column for, once per document", async () => {
    const asked: string[][] = [];

    hinting((hints) => {
      asked.push(hints);

      return Promise.resolve(HIGH_ENTROPY);
    });

    await load();
    await tick();

    history.pushState(null, "", "/b");
    await tick();

    expect(asked).toEqual([["platformVersion"]]);
  });

  it("discards the GREASE brands and everything else it did not ask for", async () => {
    answering({ ...HIGH_ENTROPY, model: "SM-X200" });

    await load();
    await tick();

    history.pushState(null, "", "/b");
    await tick();

    // One key, not the dictionary: a brand list is reduced to a major
    // server-side anyway, `model` settles a question `?0` plus the platform
    // already settles, and the rest have no column at all.
    expect(pageviews()[1]?.body).toEqual({
      wid: "wid_test",
      type: "pageview",
      vid: expect.any(String),
      path: "/b",
      language: "en-US",
      screen: 1920,
      platformVersion: "15.0.0",
    });
    expect(JSON.stringify(beacons)).not.toMatch(/brand/i);
  });

  it("clamps an over-long answer to what the schema takes", async () => {
    answering({ ...HIGH_ENTROPY, platformVersion: "9".repeat(200) });

    await load();
    await tick();

    history.pushState(null, "", "/b");
    await tick();

    expect(pageviews()[1]?.body.platformVersion).toHaveLength(32);
  });

  it("ignores an answer that is not a non-empty string", async () => {
    for (const platformVersion of ["", 15, null, { major: 15 }]) {
      beacons = [];
      answering({ ...HIGH_ENTROPY, platformVersion });

      await load();
      await tick();

      history.pushState(null, "", "/b");
      await tick();

      expect(pageviews()[1]?.body).not.toHaveProperty("platformVersion");

      vi.resetModules();
      delete (window as any).aurora;
      history.pushState = PUSH;
      history.replaceState = REPLACE;
      at("/");
    }
  });

  it("keeps the whole tracker when userAgentData throws", async () => {
    // This runs inside `activate()`, ahead of the history patch and every
    // listener, so a throw escaping it costs the document its tracker rather
    // than one field.
    hinting(() => {
      throw new Error("blocked");
    });

    await load();

    history.pushState(null, "", "/b");
    await tick();

    expect(rows()).toEqual(["/", "/b"]);
    expect(pageviews()[1]?.body).not.toHaveProperty("platformVersion");
  });

  it("swallows a rejection rather than logging in the host's console", async () => {
    const unhandled = vi.fn();

    process.on("unhandledRejection", unhandled);

    try {
      hinting(() => Promise.reject(new Error("NotAllowedError")));

      await load();
      await tick();
      await tick();

      history.pushState(null, "", "/b");
      await tick();

      expect(rows()).toEqual(["/", "/b"]);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("survives a userAgentData that is not the shape it claims", async () => {
    for (const broken of [
      { userAgentData: {} },
      { userAgentData: { getHighEntropyValues: "yes" } },
      { userAgentData: null },
    ]) {
      beacons = [];
      vi.stubGlobal("navigator", { ...navigator, ...broken });

      await load();
      await tick();

      expect(pageviews()).toHaveLength(1);
      expect(pageviews()[0]?.body).not.toHaveProperty("platformVersion");

      vi.resetModules();
      delete (window as any).aurora;
      history.pushState = PUSH;
      history.replaceState = REPLACE;
    }
  });
});

describe("hostile pages", () => {
  it("stays inert, and callable, behind a blob: src", async () => {
    // How a tag manager or a CSP-nonce setup injects a bundle. Nothing can be
    // resolved against an opaque path, and the throw used to happen before
    // `window.aurora` existed.
    await load({ src: "blob:https://host.example/2f8a-1" });

    expect(beacons).toHaveLength(0);
    expect(typeof window.aurora).toBe("function");
    expect(() => window.aurora?.("signup")).not.toThrow();
  });

  it("resolves the endpoints against the base the browser used", async () => {
    at("/blog/post");

    const base = document.createElement("base");

    base.setAttribute("href", `${location.origin}/assets/`);
    document.head.append(base);

    await load({ src: "tracker.js" });

    expect(beacons[0]?.url).toBe(`${location.origin}/assets/collect`);
  });

  it("leaves a stubbed-out pushState detectable and unarmed", async () => {
    // Consent tools and anti-tracking scriptlets do this. A wrapper over it
    // reports `typeof history.pushState === "function"` to a router that
    // feature-detects, then throws from inside the router's own stack.
    (history as any).pushState = null;

    await load();

    expect(history.pushState).toBeNull();
    expect(pageviews()).toHaveLength(1);

    // The half that is still there is still tracked.
    tap();
    history.replaceState(null, "", "/b");
    await tick();

    expect(pageviews()[1]?.body.path).toBe("/b");
  });

  it("keeps tracking navigation after a setTimeout that threw", async () => {
    await load();

    const real = globalThis.setTimeout;
    let broken = true;

    vi.stubGlobal("setTimeout", (fn: any, ms?: any) => {
      if (broken) {
        broken = false;
        throw new Error("no timers here");
      }

      return real(fn, ms);
    });

    history.pushState(null, "", "/a");
    await tick();
    history.pushState(null, "", "/b");
    await tick();

    // One navigation lost, not every navigation after it: the coalescing latch
    // used to be set before the timer and cleared only inside it.
    expect(pageviews().map((beacon) => beacon.body.path)).toEqual(["/", "/b"]);
  });

  it("still boots when window.aurora cannot be assigned", async () => {
    const stub = vi.fn();

    Object.defineProperty(window, "aurora", {
      value: stub,
      writable: false,
      configurable: true,
    });

    await load();

    expect(window.aurora).toBe(stub);
    expect(pageviews()).toHaveLength(1);
  });

  it("survives a junk entry in the stub queue", async () => {
    (window as any).aurora = Object.assign(() => {}, {
      q: [null, ["signup"]],
    });

    await load();

    expect(pageviews().map((beacon) => beacon.body.name)).toEqual([
      undefined,
      "signup",
    ]);
  });

  it("sends the pageview even when the clock and the screen are gone", async () => {
    const now = vi.spyOn(performance, "now").mockImplementation(() => {
      throw new Error("blocked");
    });

    vi.stubGlobal("screen", undefined);

    await load();

    now.mockImplementation(() => clock);

    expect(pageviews()).toHaveLength(1);
    expect(pageviews()[0]?.body.path).toBe("/");
    expect(pageviews()[0]?.body).not.toHaveProperty("screen");
  });

  it("keeps timing on a page that took performance.now away", async () => {
    const now = vi.spyOn(performance, "now").mockImplementation(() => {
      throw new Error("blocked");
    });

    await load();

    // Real elapsed time: the fallback clock is Date.now(), which is why this
    // is the one test in the file that cannot use the fake one.
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    now.mockImplementation(() => clock);

    expect(durations()).toHaveLength(1);
    expect(durations()[0]?.body.duration).toBeGreaterThan(0);
  });

  it("mints distinct tokens without crypto.randomUUID", async () => {
    // Secure-context only, and a self-hosted install over plain http is a
    // supported deployment. A repeated token collides on the unique index and
    // the pageview is dropped server-side.
    vi.stubGlobal("crypto", {});

    await load();

    history.pushState(null, "", "/b");
    await tick();

    const [first, second] = pageviews();

    expect(first?.body.vid).toEqual(expect.any(String));
    expect(second?.body.vid).not.toBe(first?.body.vid);
  });

  it("mints distinct tokens when crypto.randomUUID throws", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        throw new Error("insecure context");
      },
    });

    await load();

    history.pushState(null, "", "/b");
    await tick();

    const [first, second] = pageviews();

    // A throw between `path` and `vid` used to leave the new page addressed by
    // the previous page's token.
    expect(pageviews()).toHaveLength(2);
    expect(second?.body.vid).not.toBe(first?.body.vid);
  });

  it("sends nothing at all when it could not finish starting up", async () => {
    // A hardened page that made history non-writable: `activate()` throws
    // before the first view, so there is no token and no path, and every
    // beacon from here is a guaranteed 422 against a shared rate limit.
    Object.defineProperty(history, "pushState", {
      value: PUSH,
      writable: false,
      configurable: true,
    });

    try {
      await load();

      expect(pageviews()).toHaveLength(0);

      window.aurora?.("signup");

      expect(beacons).toHaveLength(0);
    } finally {
      Object.defineProperty(history, "pushState", {
        value: PUSH,
        writable: true,
        configurable: true,
      });
    }
  });
});
