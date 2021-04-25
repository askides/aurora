const crypto = require("crypto");
const requestIp = require("request-ip");
const localeCodes = require("locale-codes");
const UAParser = require("ua-parser-js");
const mapValuesDeep = require("deepdash/mapValuesDeep");

const { Os } = require("../../../models/Os");
const { Event } = require("../../../models/Event");
const { Engine } = require("../../../models/Engine");
const { Device } = require("../../../models/Device");
const { Locale } = require("../../../models/Locale");
const { Browser } = require("../../../models/Browser");
const { Website } = require("../../../models/Website");
const { withCors } = require("../../../utils/hof/withCors");

const fetchOrCreate = async (instance, payload) => {
  const fetched = await instance.where(payload).fetch({ require: false });

  if (fetched) {
    return fetched;
  }

  return await new instance(payload).save();
};

const handlePost = async (req, res) => {
  const uaResults = new UAParser(req.headers["user-agent"]).getResult();
  const ua = mapValuesDeep({ ...uaResults }, (v) => (v ? v : "#ND"), {});

  const { type, element, locale: _locale, seed, referrer } = req.body;

  // Get Website by seed
  const website = await Website.where("seed", seed).fetch();

  if (!website) {
    return { status: 422, data: { message: "Aurora ID not defined.." } };
  }

  const clientIp = requestIp.getClientIp(req);

  const eventHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        ua: ua.ua, // Full user-agent for now.
        ip: clientIp,
        seed: seed,
      })
    )
    .digest("hex");

  // Browser
  const browser = await fetchOrCreate(Browser, {
    name: ua.browser.name,
    version: ua.browser.version,
    major: ua.browser.major,
  });

  // Engine
  const engine = await fetchOrCreate(Engine, {
    name: ua.engine.name,
    version: ua.engine.version,
  });

  // Os
  const os = await fetchOrCreate(Os, {
    name: ua.os.name,
    version: ua.os.version,
  });

  // Create Device
  const device = await fetchOrCreate(Device, {
    vendor: ua.device.vendor,
    model: ua.device.model,
    type: ua.device.type,
  });

  // Locale
  const localeData = localeCodes.getByTag(_locale);
  const locale = await fetchOrCreate(Locale, {
    name: localeData.name,
    local: localeData.local,
    location: localeData.location,
    tag: localeData.tag,
  });

  // Create Event
  const event = await new Event({
    type: type,
    element: element,
    referrer: referrer || null,
    hash: eventHash,
    website_id: website.id,
    browser_id: browser.id,
    engine_id: engine.id,
    os_id: os.id,
    device_id: device.id,
    locale_id: locale.id,
  }).save();

  return {
    status: 200,
    data: { message: "Request successful.", id: event.id },
  };
};

const handle = async function (req, res) {
  let { status, data } = {};

  switch (req.method) {
    case "POST":
      ({ status, data } = await handlePost(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data });
};

module.exports = withCors(handle);
