const { sum } = require("../utils/math");

(async (window) => {
  const {
    screen: { width, height },
    navigator: { language },
    location: { hostname, pathname, search },
    localStorage,
    sessionStorage,
    document,
    history,
  } = window;

  let lastPageViewID = null;

  // Check Script Exists
  const script = document.querySelector("script[aurora-id]");

  if (!script) return false;

  const analyticsUrl = script.getAttribute("src").replace("/aurora.js", "/api/collect");
  const websiteSeed = script.getAttribute("aurora-id");

  fetch(analyticsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "pageView",
      element: pathname,
      locale: language,
      seed: websiteSeed,
      referrer: document.referrer,
    }),
  })
    .then((res) => res.json())
    .then((res) => res.data)
    .then((res) => (lastPageViewID = res.id))
    .catch((error) => console.log(error));

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

  const sendTiming = initializeTimings();

  document.addEventListener("visibilitychange", sendTiming);
})(window);
