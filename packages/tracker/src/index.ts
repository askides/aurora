import {
  boundProps,
  boundRevenue,
  clamp,
  normalizePath,
  readUtm,
} from "./payload";
import { send } from "./transport";
import type { AuroraApi, EventOptions, Utm } from "./types";

declare global {
  interface Window {
    aurora?: AuroraApi;
  }
}

/**
 * This script writes nothing to localStorage, sessionStorage, cookies or
 * IndexedDB, and that is the point rather than an omission: ePrivacy Art.
 * 5(3) covers "storage of information in terminal equipment", which is a
 * localStorage key just as much as a cookie. Identity and sessions are the
 * server's job now, derived from headers it already has.
 */

/** The events_duration_range check; anything above it comes back a 422. */
const MAX_DURATION = 86_400_000;

/**
 * How long after a view has settled a `replaceState` still reads as a
 * correction of that view rather than a navigation away from it.
 *
 * Measured against React 19 + React Router 8 in Chrome rather than picked. A
 * `<Navigate replace>` mount redirect landed 22ms after this script's first
 * view unthrottled and 1703ms after it on a 4x-throttled CPU over Slow 4G —
 * the spread is the app bundle downloading, not the router deciding, so a
 * budget measured from the view alone is either far too loose or misses every
 * slow connection. Anchored at the load event instead, the same two runs are
 * 30ms *before* DCL and 30ms after it, and the slowest true positive of the
 * set — a guard awaiting a 400ms /session call on that throttled profile — is
 * 577ms past `loadEventEnd`. An in-app guard redirect, which happens long
 * after the load event, lands 8.1ms after the pushState it corrects.
 *
 * Hence the anchor below is the later of the two and this is 1.7x the worst
 * case observed. A redirect behind an endpoint slower than this still
 * double-counts, exactly as it does today.
 */
const SETTLE = 1_000;

/**
 * The longest a document that has not fired `load` is still treated as one that
 * is going to.
 *
 * `readyState` goes "loading" → "interactive" → "complete", and only the last
 * step waits on subresources: one image on a dead host, one hanging ad iframe or
 * one font that never arrives leaves a page that is finished, interactive and
 * being read sitting at "interactive" for as long as the visitor keeps it open.
 * `load` never fires there, so the window `anchor()` holds open for a document
 * that has not loaded yet had nothing left to close it — see the comment there
 * for what that cost.
 *
 * Thirty seconds against a mount redirect measured at 1703ms on a 4x-throttled
 * CPU over Slow 4G: an order of magnitude past the worst true positive of that
 * set, and finite, which is the whole property that was missing.
 */
const LOADING = 30_000;

/** `document.prerendering` and `navigator.globalPrivacyControl` are both real
 * and neither is in lib.dom. */
type Prerenderable = Document & { prerendering?: boolean };
type Private = Navigator & { globalPrivacyControl?: boolean };

/**
 * `navigator.userAgentData`, which is not in lib.dom either. Every member is
 * optional because this is read on pages that predate it and on pages that have
 * stubbed it: the shape is whatever the host browser happens to have.
 */
type Hinted = Navigator & {
  userAgentData?: {
    getHighEntropyValues?: (
      hints: string[]
    ) => Promise<{ platformVersion?: unknown } | null>;
  };
};

/**
 * The rule the whole file is built around: nothing in here may surface on the
 * host page. Every entry point a browser or a site can reach — the patched
 * history methods, the listeners, `window.aurora` — goes through this, so the
 * worst a bug in this script can cost anybody is a beacon.
 */
const guard =
  <A extends unknown[]>(fn: (...args: A) => void) =>
  (...args: A): void => {
    try {
      fn(...args);
    } catch {
      // A tracker is never worth an exception in someone else's console.
    }
  };

/**
 * `crypto.randomUUID` is secure-context only, and a self-hosted install served
 * over plain http is a supported deployment, so it cannot be the only source.
 * The token has to be unique per (site, pageview) to satisfy the partial
 * unique index on `view_token` and nothing more: it is never secret, never
 * stored, and meaningless the moment the page is gone.
 */
const random = () => Math.random().toString(36).slice(2);

const token = (): string => {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // Present and throwing rather than absent, which is how some non-secure
    // context shims spell the same refusal. A throw here would land between
    // `path` and `vid` in `view()` below and leave the new page addressed by
    // the previous page's token — the exact mis-attribution this file exists
    // to fix.
  }

  return `${Date.now().toString(36)}-${random()}-${random()}`;
};

/**
 * The timer's clock. `performance.now()` is monotonic where `Date.now()`
 * follows an NTP correction, so it is the right one — but it is read on the
 * same path as the pageview beacon, and a page that has shimmed it away must
 * cost this script its durations and not its pageviews.
 */
const clock = (): number => {
  try {
    return performance.now();
  } catch {
    return Date.now();
  }
};

/**
 * Where the visit came from, and no more than that.
 *
 * `acquisition()` keeps the hostname and throws the rest away, so the path and
 * the query of a referrer buy nothing and carry everything: a search phrase, a
 * private thread, a document title, an address or a magic-link token in a
 * webmail URL. Sending them would put that across the network and through
 * every proxy and access log in front of the collector, to be discarded on
 * arrival. The origin resolves to the same `referrer_host` for every referrer
 * the server would have stored.
 *
 * Anything that is not http(s) is dropped rather than truncated: `urlHost`
 * refuses those schemes too, so it was never going to become a row.
 */
const source = (referrer: string): string | undefined => {
  try {
    const url = new URL(referrer);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The platform version, asked of the browser rather than of the request.
 *
 * `Accept-CH` is stored by a browser only from a top-level navigation response,
 * and this origin serves nothing but third-party beacons, so the ask the
 * collector puts on its 204s can never be honoured and
 * `Sec-CH-UA-Platform-Version` never arrives. The low-entropy trio does arrive
 * unasked, which is the part that makes the gap expensive: the server learns
 * the platform and not its version, and falls back to a UA string that UA
 * reduction has frozen — every Chromium Mac permanently "10", Windows 11
 * indistinguishable from Windows 10, every Android "10". Silent corruption
 * rather than a null, and rendered as fact.
 *
 * `getHighEntropyValues` reads the browser's own values in-process: no
 * `Accept-CH`, no `Permissions-Policy` delegation, no navigation. It is
 * Chromium-only and secure-context only, which is precisely the population
 * whose UA string is frozen, so the fit is exact and a browser without it must
 * — and does — behave as it did before.
 *
 * Only `platformVersion` is asked for. `model` feeds a branch that is already
 * settled by `?0` plus the platform, `fullVersionList` is reduced to a major
 * server-side anyway, and `architecture`, `bitness` and `wow64` have no column:
 * every one of them would be bytes on a beacon and a value in a breakdown
 * nobody can group on.
 *
 * Everything here is defended twice. The call is wrapped because a page may
 * have replaced `userAgentData` with something that throws — and this runs
 * inside `activate()`, ahead of the history patch and the listeners, so a throw
 * escaping it would cost the document its whole tracker rather than one field.
 * The promise carries its own `catch` because an unhandled rejection is a
 * message in the host page's console, which is the one thing this file may
 * never produce.
 */
const highEntropy = (keep: (value: string) => void): void => {
  try {
    const data = (navigator as Hinted).userAgentData;

    if (typeof data?.getHighEntropyValues !== "function") {
      return;
    }

    data
      .getHighEntropyValues(["platformVersion"])
      .then((values) => {
        const value = values?.platformVersion;

        if (typeof value === "string" && value) {
          // Clamped to the schema's bound rather than to the format's:
          // "10.0.19045.2846" is the widest answer a real platform gives, and
          // one byte over the line is a 422 for the whole beacon.
          keep(clamp(value, 32));
        }
      })
      .catch(() => {});
  } catch {
    // A hint is worth strictly less than the pageview it rides on.
  }
};

/**
 * The async stub a site installs ahead of the bundle pushes one `arguments`
 * object per call into `q`; draining it is what keeps an `aurora()` fired from
 * the page head from being lost. Read by index rather than destructured,
 * because the queue is whatever the host page wrote there.
 *
 * Every step is guarded on its own, because every one of them touches
 * something the host page owns: a page that froze `window` or defined `aurora`
 * read-only makes the assignment throw under the `"use strict"` the bundle is
 * built with, and one `null` left in the queue used to take the rest of the
 * queue — and the boot that follows this call — down with it.
 */
const install = (api: AuroraApi): void => {
  let queued: unknown[] | undefined;

  guard(() => {
    const previous = window.aurora?.q;

    queued = Array.isArray(previous) ? previous : undefined;
    window.aurora = api;
  })();

  for (const call of queued ?? []) {
    guard(() => {
      const args = call as ArrayLike<unknown>;

      api(args[0] as string, args[1] as EventOptions | undefined);
    })();
  }
};

// Guarded like every other entry point: module evaluation is the first one,
// and a `src` that will not resolve must cost the tracker and not the parser
// state of whatever runs after it on the page.
guard(() => {
  const doc = document as Prerenderable;
  const nav = navigator as Private;

  /**
   * One page, one tracker. A hardcoded snippet plus a tag-manager injection is
   * the ordinary way a site ends up serving this file twice, and the second
   * copy would wrap the already-patched history, register a second set of
   * unremovable listeners and mint its own token for every view: two pageviews
   * per navigation, two rows the unique index cannot collapse, and a doubled
   * session count that no later query can repair.
   *
   * The cost is a page deliberately reporting to two websites, which keeps the
   * first. `window.aurora` is a single global and could only ever have
   * addressed one of them anyway.
   */
  if (window.aurora?.loaded) {
    return;
  }

  /**
   * `currentScript` is only meaningful while the script is evaluating — by the
   * time any listener runs it is null — so it is read here or never. It is
   * also the only way to find the right tag when a page carries two of them;
   * the query is the fallback for a bundle loaded async or as a module, where
   * the browser hands back null.
   */
  const current = doc.currentScript;
  const script = (
    current?.hasAttribute("aurora-id")
      ? current
      : doc.querySelector("script[aurora-id]")
  ) as HTMLScriptElement | null;

  const wid = script?.getAttribute("aurora-id");

  /**
   * The IDL property and not `getAttribute("src")`. The attribute is whatever
   * the page wrote, and the browser resolved it against `<base href>` — the
   * default shape of an Angular build deployed under a sub-path, and common in
   * CMS templates — where this file used to resolve it against
   * `location.href`. The two disagree exactly when a `<base>` is present, and
   * the beacons went to a path that had never existed. `script.src` is the URL
   * the file was actually fetched from, already absolute.
   */
  const src = script?.src;

  /**
   * `window.aurora` is published API. A page that calls it must not take a
   * TypeError because the visitor turned on GPC or because someone opened the
   * build off a file:// path, so every refusal below still leaves the global
   * in place and inert — and drains the stub's queue so it cannot grow.
   */
  const inert: AuroraApi = guard(() => {});

  if (!wid || !src) {
    install(inert);
    return;
  }

  // file:, data:, blob: and extension pages have no site to attribute a view
  // to. `location.host === ""` was the old test and it is a different
  // question: about:blank has no host, a data: URL sometimes does.
  if (location.protocol !== "http:" && location.protocol !== "https:") {
    install(inert);
    return;
  }

  /**
   * Both headers are a request not to be measured, and there is nothing to
   * offer a visitor who sent one: no identifier to degrade, no storage to
   * skip. So nothing is sent at all, rather than something anonymised.
   */
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) {
    install(inert);
    return;
  }

  let collectUrl = "";
  let durationUrl = "";

  /**
   * Both endpoints resolved off the script's own src, which is the only URL
   * that is certainly reachable from this page. The old `src.replace(
   * "/tracker.js", "/collect")` broke the moment the file was renamed, served
   * from a CDN path, or fingerprinted — and failed silently, posting to a URL
   * that had never existed.
   *
   * `new URL("collect/duration", base)` and not "/collect/duration": a leading
   * slash would jump to the origin root and break an install under a sub-path.
   *
   * Wrapped, because resolving anything against an opaque path throws, and
   * `blob:` is how a tag manager or a CSP-nonce setup injects a bundle. The
   * throw used to land here, before `install` had run at all, so the refusal
   * this file promises for every other unusable deployment arrived instead as
   * an undefined `window.aurora` and a TypeError out of the host page's own
   * `aurora("signup")`.
   */
  try {
    const base = new URL(src, location.href);

    collectUrl = new URL("collect", base).href;
    durationUrl = new URL("collect/duration", base).href;
  } catch {
    install(inert);
    return;
  }

  /** The current view. All of it dies with the page; none of it is persisted. */
  let vid = "";
  let path = "";
  let elapsed = 0;
  let since = 0;
  let counting = false;
  let reported = 0;
  let landed = false;
  let ready = false;
  let scheduled = false;
  /** Whether the burst being coalesced held anything but a `replaceState`. */
  let pushed = false;
  /** When the current view was created, and what has happened to it since. */
  let born = 0;
  let acted = false;
  let fired = false;
  /** When this document activated, and when it finished loading; `settled`
   * stays 0 for as long as it has not. */
  let started = 0;
  let settled = 0;
  /** What `navigator.userAgentData` answered, once it has answered. */
  let platformVersion = "";
  /** The campaign the document arrived on; see `view()`. */
  let campaign: Utm | undefined;

  const pending: Array<[string, EventOptions | undefined]> = [];

  /**
   * Calls made before there is a view to name them, held until there is one.
   *
   * Bounded, which it was not. The queue is drained by `view()`, so anything
   * that keeps `view()` from running keeps it filling: a prerender the visitor
   * never activates, and now a tab that stays in the background. A page firing
   * a heartbeat event on a timer in either state would otherwise grow this
   * array for the life of the document, holding every `props` bag in it — up to
   * 24 keys of ~576 bytes each — on somebody else's page. Thirty-two is far past
   * any real page's boot-time conversions and costs at most a few tens of KB.
   *
   * The newest is dropped rather than the oldest: the calls that matter most
   * here are the ones a page makes on arrival, and a queue this deep is already
   * a page in a state where its later calls are not going to be attributable
   * anyway.
   */
  const hold = (name: string, options: EventOptions | undefined) => {
    if (pending.length < 32) {
      pending.push([name, options]);
    }
  };

  const stop = () => {
    if (counting) {
      elapsed += clock() - since;
      counting = false;
    }
  };

  const resume = () => {
    if (!counting) {
      since = clock();
      counting = true;
    }
  };

  /**
   * The route SETs the column rather than adding to it, so this reports the
   * running total for the view and is safe to repeat — last write wins.
   *
   * Only when the total actually moved, though. `visibilitychange` fires on
   * every tab switch and `pagehide` fires again right after it, and the rate
   * limiter is per IP and shared with /collect, so an unchanged repeat is a
   * request spent on nothing and a step closer to a 429 that would drop a real
   * pageview.
   */
  const flush = () => {
    if (!vid) {
      return;
    }

    const visible = elapsed + (counting ? clock() - since : 0);
    const duration = Math.min(Math.round(visible), MAX_DURATION);

    if (duration <= 0 || duration === reported) {
      return;
    }

    reported = duration;

    send(durationUrl, { wid, vid, duration });
  };

  const view = () => {
    /**
     * A page the visitor is not looking at is not a pageview, and that has to
     * hold for the whole life of the document rather than only at boot. A
     * router that keeps navigating in a backgrounded tab — a poll, a redirect
     * chain, a restored tab set settling — used to spend a pageview, a
     * session's cleared bounce and a slot of the rate limit that the real
     * beacons share on every route nobody saw. Worse, the view it opened
     * started a timer, so a tab left in the background booked its background
     * time as visit duration, up to the 24h clamp.
     *
     * Held rather than dropped: `path` is left where it was, so the
     * visibilitychange below re-reads `location` and records the route the tab
     * actually settled on, the moment the visitor looks at it. That now covers
     * a document's *first* view as well — `boot` no longer refuses a tab that
     * opens in the background, it activates and leans on this.
     */
    if (document.visibilityState === "hidden") {
      return;
    }

    const next = normalizePath(location.pathname, location.hash);

    // Two views of one page back to back are one view. Routers call
    // `replaceState` to keep a query string in sync with a filter or a search
    // box, which is a dozen calls for a page the visitor never left.
    if (next === path) {
      return;
    }

    /**
     * The leaving page's time, addressed by the leaving page's token, before
     * the token is replaced. This ordering is the entire fix: the accumulator
     * used to run for the life of the document and the total was attributed to
     * whatever page happened to be last, so 60s on /a then 30s on /b was one
     * 90s beacon for /b and nothing at all for /a.
     */
    flush();

    path = next;
    vid = token();
    elapsed = 0;
    reported = 0;
    counting = false;
    // Everything the correction rule below asks about the view is about *this*
    // view, so all three are reset with the token rather than per document: a
    // guard that bounces a route the visitor clicked into is as much a
    // correction as one that bounces the page they arrived on.
    born = clock();
    acted = false;
    fired = false;

    /**
     * Only on the document's first view. `document.referrer` does not change
     * across same-document navigations, so re-reading it credits one arrival
     * once per page of the visit: a four-page SPA session out of a newsletter
     * was four rows under that referrer and four `channel = 'social'` rows,
     * where the same visit on a server-rendered site sends its own host from
     * page two onward and the server drops it as a self-referral. The session
     * carries the channel from its first pageview either way.
     */
    const referrer = landed ? undefined : source(doc.referrer);

    /**
     * Snapshotted at activation for the document's first view, read live for
     * every one after it — the same split `landed` makes above, and for the
     * same reason. An SPA can route into a campaign URL, so the query has to be
     * re-read per view; but the arrival's own query is as perishable as its
     * referrer is stable, and only the referrer was protected against the view
     * being deferred.
     *
     * A tab that opens hidden holds its first view until the visitor looks at
     * it, and by then the router's mount rewrite has stripped `?utm_source`
     * from `location`. That is a campaign link cmd-clicked or middle-clicked
     * into a background tab reporting channel `direct` where the same click in
     * the foreground reports `campaign` — the skew landing on exactly the
     * new-tab, slow-connection and mobile population the deferral was added to
     * recover.
     */
    const utm = landed ? readUtm(location.search) : campaign;
    const language = nav.language;
    // Read defensively for the same reason as the clock: `screen` is universal
    // and it is still not worth a pageview.
    const width = (window.screen as Screen | undefined)?.width ?? 0;

    landed = true;

    send(collectUrl, {
      wid,
      type: "pageview",
      vid,
      path,
      // Clamped rather than dropped: only the hostname is kept server-side, so
      // a truncated origin still resolves to the right referrer, where an
      // over-long one would 422 the pageview away.
      referrer: referrer ? clamp(referrer, 1024) : undefined,
      language: language ? clamp(language, 64) : undefined,
      // The sole input to `screen_class`, and `<= 0` is stored as null anyway.
      screen: width > 0 ? width : undefined,
      // Whatever `userAgentData` has answered by now, and nothing if it has
      // not: the first view of a document is the one a fast bounce depends on,
      // so it goes out on the same task it was decided on rather than waiting
      // for a promise. That first view keeps the frozen answer the UA string
      // gives; every beacon after it carries the real one.
      platformVersion: platformVersion || undefined,
      utm,
    });

    // After the beacon rather than before it. Starting the clock is the only
    // thing in here that reads one, and a view that cannot be timed is still a
    // view that has to be recorded.
    resume();

    /**
     * The stub's queue, drained the moment there is a view to name — which is
     * here and not at the end of `activate()` any more. A document that starts
     * hidden now activates and holds its first view back, and the old drain ran
     * against an empty `vid`: `event()` rejected every held call and the queue
     * was cleared behind it, so a `revenue` conversion fired from the page head
     * of a backgrounded tab was destroyed rather than delayed.
     *
     * Emptied as it is read, so the ordinary view — where the queue is empty
     * and always will be, since `api` only fills it before `ready` — costs one
     * comparison.
     */
    for (const [name, options] of pending.splice(0)) {
      event(name, options, true);
    }
  };

  /**
   * `held` is whether this call spent time in `pending` — the async stub's
   * queue, drained by `view()` — rather than arriving live from the page. It
   * changes nothing about the beacon and one thing about the view; see `fired`
   * below.
   */
  const event = (
    name: string,
    options: EventOptions | undefined,
    held: boolean
  ) => {
    // A nameless event is a 422 for the whole beacon. A call the page got
    // wrong should cost the page its event, not the pageview behind it.
    if (typeof name !== "string" || !name) {
      return;
    }

    /**
     * And an event with no view behind it is the same 422: `vid` and `path`
     * are both `min(1)` server-side. They are still empty in two windows — a
     * throw anywhere in `activate()` ahead of the first `view()`, and a tab
     * holding its view back until it is looked at — and a beacon sent from
     * either is rejected for certain, having spent a slot of the limit the
     * pageviews depend on.
     *
     * Held rather than dropped, which is the other half of the fix recorded
     * above `view()`'s drain. That comment fixed the call made *before*
     * activation; a call made *after* it in a tab that is still hidden took the
     * old outcome and was destroyed here — a document that boots in the
     * background activates fully, `ready` goes true, and every `aurora()` call
     * then walked straight past `api`'s queue into this return. A
     * `newsletter_signup` with revenue on it was gone permanently, and nothing
     * anywhere recorded that it had happened. `view()` empties this queue the
     * moment the visitor looks at the tab, with `vid` and `path` both already
     * assigned, so the drain can never land back here and loop.
     */
    if (!vid || !path) {
      if (!held) {
        hold(name, options);
      }

      return;
    }

    const opts = options ?? {};

    /**
     * A page that reported something happening on this view has told this
     * script the view was real, whatever the clock says: `route()` below stops
     * reading a later `replaceState` as a correction of it.
     *
     * Unless the call was held, which means it came out of the async stub's
     * queue. That one was made before the bundle landed and therefore before
     * the view existed, so it is evidence about the page and none at all about
     * the view — and counting it disarmed the correction rule for every site
     * using the documented snippet, which is most of them. The mount redirect
     * booked its second row again, with the phantom path it names and the
     * cleared bounce that goes with it.
     */
    fired = fired || !held;

    send(collectUrl, {
      wid,
      type: "event",
      name: clamp(name, 200),
      // Custom events store no `view_token`, so the current view's token names
      // the page the event happened on and collides with nothing in the
      // partial unique index.
      vid,
      path,
      // Carried here too, and not only on pageviews: the row an event writes
      // holds the same five client columns a pageview's does, so omitting it
      // would file one visitor's events under a different OS version than their
      // pageviews and split the breakdown between them.
      platformVersion: platformVersion || undefined,
      props: boundProps(opts.props),
      revenue: boundRevenue(opts.revenue),
    });
  };

  const api: AuroraApi = guard((name: string, options?: EventOptions) => {
    // Held rather than sent while a prerender is still a prerender.
    if (!ready) {
      hold(name, options);
      return;
    }

    event(name, options, false);
  });

  // What a second copy of this bundle looks for. Set before `boot`, because a
  // prerender can defer activation for as long as the visitor takes to click.
  api.loaded = true;

  /**
   * When the settle window opens: the later of the view being created and the
   * document finishing loading — and `now` for as long as it has not finished,
   * because an app that has not run yet cannot have redirected yet.
   *
   * `settled` stays 0 for a bundle a tag manager injected after the load event,
   * where `readyState` is already "complete" and the listener never fires; the
   * view's own birth is the right anchor there and `Math.max` picks it.
   *
   * The "has not finished" half is bounded rather than open, which it used to
   * not be: it tested for "complete" and returned `clock()` — an anchor that is
   * always now, so a window that never closes — for both of the other two
   * states. A document with one stalled subresource sits at "interactive"
   * indefinitely, and there `correcting()` collapsed to nothing but "no gesture
   * and no custom event", neither of which a background tab can ever produce.
   * A router's own `replaceState` ten minutes later then silently repointed the
   * row naming the page the visitor had actually been reading, and every one
   * after it spent a beacon saying so, unbounded in wall-clock time. Past
   * `LOADING` the loading branch expires and each view falls back to the same
   * one-second window the loaded branch gives it.
   */
  const anchor = () =>
    document.readyState === "complete"
      ? Math.max(born, settled)
      : Math.max(born, Math.min(clock(), started + LOADING));

  /**
   * Whether a `replaceState` arriving now is a mount-time correction of the
   * current view rather than a navigation away from it.
   *
   * The method is the first half of the answer and the reason `schedule` had to
   * start carrying one: a redirect a router issues while a route settles is a
   * `replaceState` precisely because the pre-redirect URL must not stay in
   * history, where a navigation the visitor asked for is a `pushState` or a
   * `popstate`. It is not the whole answer, since routers replace for ordinary
   * reasons too, so three more have to agree:
   *
   * - No gesture since this view was created. An auth guard, a locale prefix
   *   and a boot redirect are nobody's idea; a navigation is. This is the
   *   discriminator that survives an arbitrary delay, and it is kept per view
   *   rather than read from `navigator.userActivation.hasBeenActive`, which is
   *   sticky for the life of the document — one click anywhere would disarm
   *   this rule for every view after it, including the guard redirect on the
   *   route that click opened.
   * - No custom event named this view, handled in `event()` above.
   * - Inside the settle window, which is the only reason a router's own
   *   `replaceState` seconds later — a filter, a search box, a wizard step —
   *   is still a navigation even with no gesture behind it.
   *
   * Two redirects are deliberately outside this, and a reader comparing a
   * dashboard against their own app should know which. A redirect issued by a
   * route loader is a `pushState` in React Router 8 unless the app asks for a
   * replace — measured, not assumed — so it is counted as the navigation it
   * genuinely is, back button and all. And a guard that decides behind an
   * endpoint slower than the window redirects too late to be corrected, and
   * books the second pageview it books today.
   */
  const correcting = () =>
    Boolean(vid) && !acted && !fired && clock() - anchor() <= SETTLE;

  /**
   * The correction itself: one beacon that moves the row already written to the
   * path the redirect settled on, under the same token.
   *
   * The alternative was to leave the row alone and just stop counting the
   * second view, which needs no server at all — but the row would keep naming
   * the pre-redirect path, and a visit that an ordinary server-rendered site
   * reports once as `/login` would be reported once as `/`. Every headline
   * figure is already right by then: this view keeps its token, so its bounce
   * flag, its acquisition and its clock are the arriving visit's and not a
   * second one's.
   *
   * No `flush()` and no new token, deliberately. The visitor never left, so the
   * time keeps running on the view they are looking at.
   *
   * Sent from a hidden tab as well, where every other beacon in this file is
   * held: the row it repairs already exists and is already wrong, and holding
   * the repair back would leave `path` naming the pre-redirect page — so the
   * moment the tab came forward, `view()` would read the difference as a second
   * page and book the extra row this exists to prevent.
   */
  const correct = () => {
    const next = normalizePath(location.pathname, location.hash);

    if (next === path) {
      return;
    }

    path = next;

    send(collectUrl, { wid, type: "pageview", vid, path, corrects: true });
  };

  /**
   * Every navigation hook lands here, carrying whether the burst that produced
   * it contained anything but a `replaceState`.
   */
  const route = (push: boolean) => {
    if (!push && correcting()) {
      correct();
      return;
    }

    view();
  };

  /**
   * `location` has not moved yet when a `pushState` patch runs, and the url
   * argument is whatever the router felt like passing — undefined, a URL
   * object, a relative string, a full href. One task later `location.pathname`
   * is the only thing that is certainly the new page, so that is what is read.
   *
   * Coalesced to one task per tick because a router that calls `replaceState`
   * three times while it settles a route has navigated once.
   *
   * The method survives the coalescing rather than the last call winning: a
   * router that pushes a route and then replaces the URL to normalise it has
   * navigated, so anything but a `replaceState` anywhere in the burst makes the
   * whole burst one.
   */
  const schedule = guard((push: boolean) => {
    pushed = pushed || push;

    if (scheduled) {
      return;
    }

    scheduled = true;

    try {
      setTimeout(
        guard(() => {
          const burst = pushed;

          scheduled = false;
          pushed = false;
          route(burst);
        }),
        0
      );
    } catch {
      // Dropped with the navigation it belonged to, so a push that never ran
      // cannot arm the next `replaceState` against the correction rule.
      pushed = false;
      // A latch is only worth holding for a task that is going to run. A host
      // that has replaced `setTimeout` with something that throws must cost
      // this one navigation rather than every navigation after it, which is
      // what an un-released latch bought: the guard around this function
      // swallowed the throw and `schedule` returned early forever.
      scheduled = false;
    }
  });

  const patch = (name: "pushState" | "replaceState") => {
    const original = history[name];

    /**
     * Nothing is wrapped around a method that is not there. Consent tools,
     * anti-tracking scriptlets and hardened enterprise builds do stub these
     * out, and a wrapper over a non-function is worse than the hole it fills:
     * it turns the `typeof history.pushState` a router feature-detects from
     * `"undefined"` into `"function"`, then throws `original.apply is not a
     * function` from inside that router's own stack — the one place the guard
     * around this file cannot reach.
     */
    if (typeof original !== "function") {
      return;
    }

    history[name] = function (
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      // Called through first and untouched: a SecurityError the host's own call
      // was going to raise must still reach it, and nothing may read `location`
      // before it has moved.
      original.apply(this, args);
      schedule(name === "pushState");
    };
  };

  const activate = () => {
    /**
     * The activation latch, and now the only thing holding it: the queue drain
     * moved into `view()`, where a held call finally has a view to name, so
     * `{ once: true }` on `prerenderingchange` and this flag are no longer two
     * halves of one guarantee. This is the half that matters — losing it
     * re-registers every listener and re-patches the already-patched history.
     */
    if (ready) {
      return;
    }

    ready = true;
    // The fallback end of the loading window in `anchor()`, and the moment the
    // document's own arrival is read below.
    started = clock();

    // First, so that the answer has the longest possible run at the first
    // beacon — and asked exactly once per document, which is what the
    // activation latch above already guarantees.
    highEntropy((value) => {
      platformVersion = value;
    });

    // Read here rather than in `view()`, because a view can be deferred for as
    // long as the visitor leaves the tab in the background and a query cannot
    // survive the router's mount rewrite. `view()` explains what that cost.
    campaign = readUtm(location.search);

    // Hooks before the first beacon: if anything in the initial view were to
    // throw, a tracker that had stopped listening to navigation would be worse
    // than one that missed a pageview.
    patch("pushState");
    patch("replaceState");

    // Back and forward were invisible before this. A same-document back
    // navigation fires popstate and touches no other hook. Always a navigation
    // and never a correction: the visitor asked for this one by name.
    window.addEventListener(
      "popstate",
      guard(() => {
        schedule(true);
      })
    );

    /**
     * The two inputs to the correction rule that only a listener can supply.
     *
     * `load` is the anchor of the settle window, and the reason it is anchored
     * there rather than at the view: a redirect a router issues on mount waits
     * for the app bundle, so measured from the view it lands anywhere between
     * 20ms and two seconds depending on the connection, and measured from the
     * load event it lands within a few dozen ms of it either way.
     *
     * The gesture listeners are capture-phase so a page that stops propagation
     * cannot hide the click from them, and passive so this script can never be
     * the reason a scroll or a tap janks. They are the only listeners in here
     * that fire on ordinary interaction, which is why they do nothing but set
     * a flag.
     */
    window.addEventListener(
      "load",
      guard(() => {
        settled = clock();
      })
    );

    const act = guard(() => {
      acted = true;
    });

    for (const gesture of ["pointerdown", "keydown", "touchstart"]) {
      window.addEventListener(gesture, act, { capture: true, passive: true });
    }

    /**
     * Hash routing. This listener was removed once as provably dead code, and
     * it was dead for exactly one reason: /collect split the path on `[?#]`, so
     * `/#/a` and `/#/b` were both the row `/` and a hash change could only ever
     * mint a token for a path already recorded. The column keeps a route-shaped
     * fragment now, `normalizePath` reads `location.hash`, and the listener
     * stops being dead the moment both of those are true.
     *
     * Registered even though `createHashRouter` moves the hash through
     * `pushState` and is already covered by the patch above, because a router
     * that assigns `location.hash` — or an ordinary `<a href="#/orders">` —
     * fires nothing else at all. Back and forward across two hash entries fire
     * popstate and this one both, and the coalescing in `schedule` is what makes
     * that pair a single view.
     *
     * A navigation and never a correction, like popstate: a hash moves because
     * something asked it to. The mount rewrite it could be confused with, a
     * boot-time `/` to `/#/`, normalises to the path the view already holds and
     * is dropped by the dedupe in `view()` without a rule of its own.
     */
    window.addEventListener(
      "hashchange",
      guard(() => {
        schedule(true);
      })
    );

    /**
     * Two events for one job, deliberately. `visibilitychange` is the only one
     * that fires when a tab is merely backgrounded; `pagehide` is the only one
     * that fires reliably when iOS Safari tears the page down. `flush` is
     * idempotent, so a browser that fires both still spends one beacon.
     */
    document.addEventListener(
      "visibilitychange",
      guard(() => {
        if (document.visibilityState === "hidden") {
          stop();
          flush();
          return;
        }

        /**
         * Time in a background tab is not visit duration — and the route the
         * tab is on now may not be the one it was on when it was backgrounded,
         * so the view it was holding is recorded here, against the path the
         * visitor is actually looking at.
         *
         * Unless a navigation is already pending, which is the one case this
         * listener must not decide on its own. `schedule()` defers `route()`
         * through a `setTimeout`, and a hidden tab is where browsers throttle
         * those hardest — one a second in Chrome and Firefox, one a *minute* in
         * Chrome once a tab has been hidden five minutes — so the deferred task
         * cannot run until the tab is foregrounded, and `visibilitychange` is
         * always delivered first. Calling `view()` here regardless minted a
         * second row for the post-redirect path, and by the time `route()`
         * finally ran, `correct()` found the path it was going to move to and
         * no-opped: two rows for one arrival, the second carrying no referrer
         * because `landed` was already true, for any mount redirect issued in
         * the last second — or minute — of a background period.
         *
         * The pending task knows whether the route the tab settled on is a
         * correction of the held view or a navigation away from it. This
         * listener does not, and there is nothing it can see that would tell
         * it.
         */
        if (!scheduled) {
          view();
        }

        resume();
      })
    );

    window.addEventListener(
      "pagehide",
      guard(() => {
        stop();
        flush();
      })
    );

    /**
     * A bfcache restore fires no popstate and no navigation hook — the
     * document was never torn down — so without this the back button lands on
     * a page that is live, being read, and recorded nowhere.
     *
     * It starts a fresh view rather than resuming the old one because the
     * duration column is overwritten and not accumulated: resuming would send
     * a smaller total for the same token and erase the time already reported.
     */
    window.addEventListener(
      "pageshow",
      guard((restore: PageTransitionEvent) => {
        if (restore.persisted) {
          path = "";
          view();
        }
      })
    );

    view();
  };

  /**
   * A prerendered document is a page the visitor has not asked to look at, and
   * Chrome runs the whole script in one. Recording it would count a navigation
   * that may never happen, with a referrer and a timer belonging to a page
   * nobody has seen. That is a real second document with its own activation
   * signal, so it keeps its own branch, unchanged.
   *
   * A document that merely starts hidden used to be refused here, with an inert
   * global and no listeners at all, and the objection that used to be written
   * in this comment turned out to be right: it now activates and defers.
   *
   * - Hidden at boot is the ordinary shape of a cmd-click, a middle-click, an
   *   "open link in new tab", a minimised window, and of any load that simply
   *   finished after the visitor tabbed away. On a slow connection that last
   *   one is routine, which made the refusal a systematic deletion of exactly
   *   the mobile and slow-connection sessions a performance-minded owner is
   *   looking for.
   * - It cost far more than the pageview it was aimed at. `install(api)` runs
   *   before this, so the stub's queue was already drained into `pending`, and
   *   `install(inert)` then overwrote the API that was the only thing that
   *   could ever have sent it: every `aurora()` call from that document,
   *   `revenue` conversions included, died with the tab. The inert function
   *   also carried no `loaded` flag, so a second copy of this bundle would
   *   boot on top of it.
   * - It defeated the prerender branch above. A prerender activated into a
   *   briefly hidden tab re-entered `boot` and was refused here.
   *
   * Deferring is safe because holding a view back is `view()`'s own job and
   * has been since it started gating on visibility: nothing under a hidden
   * document sends. `patch()` and the listeners registered in `activate()`
   * send nothing by themselves, the first `view()` returns before it mints a
   * token, and `visibilitychange` then re-reads `location` and records the
   * route the tab actually settled on, with the arrival credit intact because
   * `landed` is still false. A background tab the visitor never opens still
   * sends nothing at all, which is everything the refusal ever bought.
   *
   * This contradicts §7.7 of the contract as written. The clause conflated a
   * prerender with a background-tab open; only the first of those is a page
   * nobody asked for.
   */
  const boot = guard(() => {
    if (doc.prerendering) {
      doc.addEventListener("prerenderingchange", boot, { once: true });
      return;
    }

    activate();
  });

  // Before boot, because a prerender defers activation for as long as the
  // visitor takes to click and the page can call `aurora()` throughout.
  install(api);

  boot();
})();
