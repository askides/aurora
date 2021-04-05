const crypto = require("crypto");
const UAParser = require("ua-parser-js");
const mapValuesDeep = require("deepdash/mapValuesDeep");
const { withCors } = require("../../utils/hof/withCors");
const db = require("../../lib/db_connect");

const handlePost = async (req, res) => {
  const uaResults = new UAParser(req.headers["user-agent"]).getResult();
  const ua = mapValuesDeep({ ...uaResults }, (v) => (v ? v : "#ND"), {});

  const { type, element, locale, seed } = req.body;

  // const ip = req.headers["x-real-ip"];

  const eventHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        ua: ua.ua, // Full user-agent for now.
        ip: "127.0.0.1", // XXX TODO IP
      })
    )
    .digest("hex");

  // Get Website by seed
  const website = await db("websites").where("websites.seed", seed).first();

  // Create Browser
  const browser = await db("browsers").insert({
    name: ua.browser.name,
    version: ua.browser.version,
    major: ua.browser.major,
  });

  // Create Engine
  const engine = await db("engines").insert({
    name: ua.engine.name,
    version: ua.engine.version,
  });

  // Create Os
  const os = await db("oses").insert({
    name: ua.os.name,
    version: ua.os.version,
  });

  // Create Device
  const device = await db("devices").insert({
    vendor: ua.device.vendor,
    model: ua.device.model,
    type: ua.device.type,
  });

  // Create Event
  const event = await db("events").insert({
    type: type,
    element: element,
    locale: locale,
    hash: eventHash,
    website_id: website.id,
    browser_id: browser.id,
    engine_id: engine.id,
    os_id: os.id,
    device_id: device.id,
  });

  return { status: 200, data: { message: "Request successful." } };
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
