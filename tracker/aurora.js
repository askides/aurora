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
      referrer: document.referrer, // TODO:
    }),
  })
    .then((res) => res.json())
    .then((res) => res.data)
    .then((res) => (lastPageViewID = res.id))
    .then((res) => console.log("Hash", lastPageViewID))
    .catch((error) => {
      console.error("Error:", error);
    });

  // On Unload
  // window.addEventListener("unload", function () {
  //   navigator.sendBeacon(
  //     `${analyticsUrl}/${hash}`,
  //     JSON.stringify({
  //       seed: websiteSeed,
  //       duration: performance.now() - initTime, // TODO
  //     })
  //   );
  // });

  // Listerer Cycle
  let initTime = performance.now();
  const timings = [];

  const getVisitDuration = () => performance.now() - initTime;

  const sum = (args) => args.reduce((acc, el) => acc + el, 0);

  const sendTiming = () => {
    if (document.visibilityState === "hidden") {
      // Push current duration in timings
      const vd = getVisitDuration();

      timings.push(vd);

      console.log("SUM", sum(timings));

      navigator.sendBeacon(
        `${analyticsUrl}/${lastPageViewID}`,
        JSON.stringify({
          seed: websiteSeed,
          duration: sum(timings), // TODO
        })
      );
    } else {
      console.log("Ciccio");
      initTime = performance.now();
    }
  };

  document.addEventListener("visibilitychange", sendTiming);
})(window);
