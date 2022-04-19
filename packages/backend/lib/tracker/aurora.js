/**
 * Helpers Functions
 * This functions are helpers.
 */

const getMidnight = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 24, 0, 0);
};

const getLastQuarter = () => {
  const now = new Date();
  return now.setMinutes(now.getMinutes() - 15);
};

const getTimestamp = () => {
  return +new Date();
};

const setData = (data) => {
  const midnight = getMidnight();
  const useAurora = { ...data, expires: +midnight };
  localStorage.setItem("_useAurora", JSON.stringify(useAurora));
};

const createUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/** Funzionamento Tracker
 *  Questa funzione è la funzione principale del tracker.
 *
 *  Al primo caricamento della pagina viene eseguita la funzione getData()
 *  che restituisce un oggetto contenente le informazioni necessarie per il funzionamento del tracker.
 *
 *  Se l'utente è un nuovo visitatore, allora viene creato un nuovo ID univoco e viene salvato in locale.
 *  Vengono impostati i parametri:
 *  - uid: ID univoco dell'utente (Generato randomicamente)
 *  - isNewVisitor: true se l'utente è un nuovo visitatore (default a true, alla prima visita)
 *  - isNewSession: true se la visita è una nuova sessione (default a true, alla prima visita), la sessione dura 15 minuti
 *  - lastPageViewID: ID dell'ultima pagina visitata (default a null, alla prima visita)
 *  - lastVisitAt: timestamp dell'ultima visita (default a timestamp corrente)
 *
 *  Controllo Nuova Sessione:
 *
 *  Se l'utente non è un nuovo visitatore, viene verificato se la visita è all'interno della stessa sessione.
 *  Se sono passati più di 15 minuti dall'ultima visita, viene creata una nuova sessione.
 *
 *  Controllo Nuovo Visitatore:
 *
 *  Il nuovo visitatore viene impostato a true alla creazione del payload, dopo il primo tracking viene impostato a false.
 *  Rimane invariato fino alla scadenza del payload che avviene alla mezzanotte del giorno stesso.
 *
 *  Controllo Rimbalzo:
 *
 *  Alla prima visita, viene impostato is_a_bounce = true di default, essendo l'unica pagina.
 *  Nel momento in cui vi è una seconda visita all'interno della stessa sessione, viene impostato is_a_bounce = false per il record
 *  precedente, ed anche per i nuovi.
 *  Nel caso in cui la sessione dei 15 minuti sia scaduta e ce ne sia una nuova, viene impostato is_a_bounce nuovamente a true.
 *
 *
 */

const getData = () => {
  const useAurora = JSON.parse(localStorage.getItem("_useAurora"));
  const lastQuarter = getLastQuarter();

  if (!useAurora || useAurora.expires <= +new Date()) {
    const ts = getTimestamp();
    const uid = createUUID();

    return {
      uid: uid,
      isNewVisitor: true,
      isNewSession: true,
      lastPageViewID: null,
      lastVisitAt: ts,
    };
  }

  // Se sono passati più di 15 minuti dall'ultima visita, viene creata una nuova sessione
  if (useAurora.lastVisitAt <= +lastQuarter) {
    useAurora.isNewSession = true;
  }

  return useAurora;
};

const sum = (args = []) => args.reduce((acc, el) => acc + el, 0);

(async (window) => {
  const {
    navigator: { language },
    location: { pathname, host },
    document,
    history,
  } = window;

  let lastPageViewID = null;
  let current = pathname;

  const events = Object.freeze({
    PAGE_VIEW: "pageView",
  });

  // Check Script Exists
  const script = document.querySelector("script[aurora-id]");

  if (!script) return false;

  // Only HTTP/HTTPS
  if (host === "") return false;

  const analyticsUrl = script
    .getAttribute("src")
    .replace("/t/aurora.js", "/api/collect");

  const wid = script.getAttribute("aurora-id");

  // Tracking
  const track = async (path) => {
    const data = getData();

    try {
      const res = await fetch(analyticsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: events.PAGE_VIEW,
          element: path,
          language: language,
          wid: wid,
          referrer: document.referrer,
          ...data,
        }),
      });

      const resJson = await res.json();
      data.lastPageViewID = resJson.id;
    } catch (err) {
      console.log("Err");
    }

    // After Tracking..
    // data.lastPageViewID = 1; //res.id;
    data.isNewVisitor = false;
    data.isNewSession = false;
    data.lastVisitAt = getTimestamp();

    setData(data);
  };

  // Listerer Cycle
  const initializeTimings = (timings = []) => {
    let start = performance.now();

    return () => {
      if (document.visibilityState === "hidden") {
        // Push current duration in timings
        timings.push(performance.now() - start);

        const blob = new Blob(
          [
            JSON.stringify({
              wid: wid,
              duration: sum(timings),
            }),
          ],
          { type: "application/json; charset=UTF-8" }
        );

        // TODO: lastPageViewID is not working
        navigator.sendBeacon(`${analyticsUrl}/${lastPageViewID}`, blob);
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
