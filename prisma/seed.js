const { PrismaClient } = require("@prisma/client");
const UserAgent = require("user-agents");
const crypto = require("crypto");
const UAParser = require("ua-parser-js");
const mapValuesDeep = require("deepdash/mapValuesDeep");
const generateSeed = require("../utils/generate-seed");
const { hash } = require("../utils/hash");
const { executionAsyncResource } = require("async_hooks");
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
  const items = ["/homepage", "/users/new", "/faq", "/bookings?status=opened", "/", "/doggos"];
  const locales = [
    "en-JM",
    "en-MY",
    "en-NZ",
    "en-PH",
    "en-SG",
    "en-TT",
    "en-US",
    "en-ZA",
    "en-ZW",
    "es-AR",
    "es-BO",
    "es-CL",
    "es-CO",
    "es-CR",
    "es-DO",
    "es-EC",
    "es-ES",
    "es-GT",
    "es-HN",
    "es-MX",
    "es-NI",
    "es-PA",
    "es-PE",
    "es-PR",
    "es-PY",
    "es-SV",
    "es-US",
    "es-UY",
    "es-VE",
    "et-EE",
    "eu-ES",
    "fa-IR",
    "fi-FI",
    "fil-PH",
    "fo-FO",
    "fr-BE",
    "fr-CA",
    "fr-CH",
    "fr-FR",
    "fr-LU",
    "fr-MC",
    "fy-NL",
  ];

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
        element: items[Math.floor(Math.random() * items.length)],
        hash: eventHash,
        locale: locales[Math.floor(Math.random() * items.length)],
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

seedFakeEvents()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
