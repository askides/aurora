const FingerprintJS = require("@fingerprintjs/fingerprintjs");
const { sum } = require("../utils/math");

const fpPromise = FingerprintJS.load();

(async (window) => {
  const {
    navigator: { language },
    location: { pathname },
    document,
    history,
  } = window;

  const fp = await fpPromise;
  const result = await fp.get();
  const fingerprint = result.visitorId;

  let lastPageViewID = null;

  // Check Script Exists
  const script = document.querySelector("script[aurora-id]");

  if (!script) return false;

  const analyticsUrl = `${process.env.NEXT_PUBLIC_API_URL}/v2/collect`; // script.getAttribute("src").replace("/aurora.js", "/api/collect");
  const websiteSeed = script.getAttribute("aurora-id");

  // Vars
  let current = pathname;

  // Tracking
  const track = (path) => {
    fetch(analyticsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "pageView",
        element: path,
        language: language,
        seed: websiteSeed,
        referrer: document.referrer,
        fingerprint: fingerprint,
      }),
    })
      .then((res) => res.json())
      .then((res) => (lastPageViewID = res.id))
      .catch((error) => console.log(error));
  };

  // Listerer Cycle
  const initializeTimings = (timings = []) => {
    let start = performance.now();

    return () => {
      if (document.visibilityState === "hidden") {
        // Push current duration in timings
        timings.push(performance.now() - start);

        navigator.sendBeacon(
          `${analyticsUrl}/${lastPageViewID}`,
          JSON.stringify({
            seed: websiteSeed,
            duration: sum(timings),
          })
        );
      } else {
        start = performance.now();
      }
    };
  };

  track(current);

  const sendTiming = initializeTimings();

  document.addEventListener("visibilitychange", sendTiming);

  const handlePushState = () => {
    const pushState = history.pushState;

    return (...args) => {
      const [, , url] = args;

      if (url !== current) {
        current = url;
        track(url);
      }

      return pushState.apply(history, args);
    };
  };

  history.pushState = handlePushState();
})(window);
