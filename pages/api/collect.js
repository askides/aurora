const crypto = require("crypto");
const UAParser = require("ua-parser-js");
const mapValuesDeep = require("deepdash/mapValuesDeep");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const allowCors = (fn) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

const handler = async (req, res) => {
  // Only POST Available
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const uaResults = new UAParser(req.headers["user-agent"]).getResult();
  const ua = mapValuesDeep({ ...uaResults }, (v) => (v ? v : "#ND"), {});

  const { type, element, locale } = req.body;

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

  // Create Event
  const createdEvent = await prisma.event.create({
    data: {
      type: type,
      element: element,
      locale: locale,
      hash: eventHash,
      website: {
        connect: {
          id: 1,
        },
      },
      browser: {
        create: {
          name: ua.browser.name,
          version: ua.browser.version,
          major: ua.browser.major,
        },
      },
      engine: {
        create: {
          name: ua.engine.name,
          version: ua.engine.version,
        },
      },
      os: {
        create: {
          name: ua.os.name,
          version: ua.os.version,
        },
      },
      device: {
        create: {
          vendor: ua.device.vendor,
          model: ua.device.model,
          type: ua.device.type,
        },
      },
    },
  });

  await prisma.$disconnect();

  return res.json({
    data: createdEvent,
  });
};

module.exports = allowCors(handler);
