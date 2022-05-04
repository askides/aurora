import UAParser from "ua-parser-js";

const ucFirst = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const parse = (ua) => {
  const elements = [];
  const parsed = new UAParser(ua).getResult();

  /**
   * Strict checking of data, in order to avoid partial informations.
   */

  if (parsed.browser && parsed.browser.name && parsed.browser.version) {
    elements.push({
      type: "browser",
      value: parsed.browser.name,
      version: parsed.browser.version,
    });
  }

  if (parsed.os && parsed.os.name && parsed.os.version) {
    elements.push({
      type: "os",
      value: parsed.os.name,
      version: parsed.os.version,
    });
  }

  if (parsed.engine && parsed.engine.name && parsed.engine.version) {
    elements.push({
      type: "engine",
      value: parsed.engine.name,
      version: parsed.engine.version,
    });
  }

  if (parsed.device) {
    const device = parsed.device.type ? parsed.device.type : "desktop";

    elements.push({
      type: "device",
      value: ucFirst(device),
      version: null, // There is not any version.
    });
  }

  return {
    elements: elements,
  };
};
