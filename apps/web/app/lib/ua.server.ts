import { UAParser } from "ua-parser-js";

export type MetadataElement = {
  type: string;
  value: string;
  version: string | null;
};

const ucFirst = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Strict checking of data, in order to avoid partial informations.
 */
export const parse = (ua: string | null | undefined) => {
  const elements: MetadataElement[] = [];
  const parsed = new UAParser(ua ?? "").getResult();

  if (parsed.browser?.name && parsed.browser?.version) {
    elements.push({
      type: "browser",
      value: parsed.browser.name,
      version: parsed.browser.version,
    });
  }

  if (parsed.os?.name && parsed.os?.version) {
    elements.push({
      type: "os",
      value: parsed.os.name,
      version: parsed.os.version,
    });
  }

  if (parsed.engine?.name && parsed.engine?.version) {
    elements.push({
      type: "engine",
      value: parsed.engine.name,
      version: parsed.engine.version,
    });
  }

  if (parsed.device) {
    elements.push({
      type: "device",
      value: ucFirst(parsed.device.type ?? "desktop"),
      version: null, // There is not any version.
    });
  }

  return { elements };
};
