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
    }),
  }).catch((error) => {
    console.error("Error:", error);
  });
})(window);
