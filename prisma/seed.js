const { PrismaClient } = require("@prisma/client");
const UserAgent = require("user-agents");
const crypto = require("crypto");
const UAParser = require("ua-parser-js");
const mapValuesDeep = require("deepdash/mapValuesDeep");
const generateSeed = require("../utils/generate-seed");
const { hash } = require("../utils/hash");
const prisma = new PrismaClient();

async function seedWebsiteAndUser() {
  const seed = generateSeed();
  const password = hash("password");

  const initialWebsite = await prisma.user.upsert({
    where: { email: "info@renatopozzi.me" },
    update: {},
    create: {
      email: `info@renatopozzi.me`,
      firstname: "Renato",
      lastname: "Pozzi",
      password: password,
      websites: {
        create: {
          name: "Renato Pozzi",
          url: "https://renatopozzi.me",
          seed: seed,
        },
      },
    },
  });
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedFakeEvents() {
  for (let i = 0; i < 1000; i++) {
    const userAgent = new UserAgent();
    const uaResults = new UAParser(userAgent.toString()).getResult();
    const ua = mapValuesDeep({ ...uaResults }, (v) => (v ? v : "#ND"), {});

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
        type: "pageView",
        element: "/",
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
  }
}

seedWebsiteAndUser()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
seedFakeEvents()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  */
