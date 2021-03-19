const UAParser = require("ua-parser-js");
const mapValuesDeep = require("deepdash/mapValuesDeep");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  const uaResults = new UAParser(req.headers["user-agent"]).getResult();
  const ua = mapValuesDeep({ ...uaResults }, (v) => (v ? v : "#ND"), {});

  // Create Event
  const createdEvent = await prisma.event.create({
    data: {
      type: "pageView",
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

  res.json({
    data: createdEvent,
  });
};
