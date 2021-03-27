// Hello

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

  // console.log("Screen", screen);
  // console.log("Navigator", navigator);
  // console.log("Location", location);
  // console.log("document", document);
  // console.log("history", history);
  // console.log("SessionStorage", sessionStorage);

  const rawResponse = await axios
    .post(analyticsUrl, {
      type: "pageView",
      element: location.pathname,
      locale: navigator.language,
    })
    .catch((err) => console.log(err));
  // const rawResponse = await fetch("http://localhost:3000/api/collect", {
  //   method: "POST",
  //   headers: {
  //     Accept: "application/json",
  //     "Content-Type": "application/json",
  //   },
  //   mode: "no-cors",
  //   body: JSON.stringify({
  //     type: "pageView",
  //     element: location.pathname,
  //   }),
  // });
})(window);
