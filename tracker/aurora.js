const { default: axios } = require("axios");

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

  axios
    .post(analyticsUrl, {
      type: "pageView",
      element: location.pathname,
      locale: navigator.language,
      seed: websiteSeed,
    })
    .catch((err) => console.log(err));
})(window);
