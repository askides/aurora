const users = [
  {
    firstname: "Renato",
    lastname: "Pozzi",
    email: "info@renatopozzi.me",
    password: "$2a$10$QbwulVrqqmS3rzwA41ArdOM7al6bQo2eLaQGaDGcjF4MrT58scoKa",
  },
];

const websites = [
  {
    name: "Renato Pozzi Website.",
    url: "https://renatopozzi.me",
    seed: "40551333ba09839f5287a7a6aa2f73fe",
    user_id: 1,
  },
];

const browsers = [
  {
    name: "Chrome",
    version: "89.0.4389.105",
    major: "89",
  },
  {
    name: "Chrome",
    version: "89.0.4389.105",
    major: "89",
  },
  {
    name: "Chrome",
    version: "89.0.4389.105",
    major: "89",
  },
  {
    name: "Chrome",
    version: "89.0.4389.105",
    major: "89",
  },
  {
    name: "Firefox",
    version: "87.0",
    major: "87",
  },
];

const engines = [
  {
    name: "Blink",
    version: "89.0.4389.105",
  },
  {
    name: "Blink",
    version: "89.0.4389.105",
  },
  {
    name: "Blink",
    version: "89.0.4389.105",
  },
  {
    name: "Blink",
    version: "89.0.4389.105",
  },
  {
    name: "Gecko",
    version: "87.0",
  },
];

const oses = [
  {
    name: "Linux",
    version: "x86_64",
  },
  {
    name: "Linux",
    version: "x86_64",
  },
  {
    name: "Linux",
    version: "x86_64",
  },
  {
    name: "Linux",
    version: "x86_64",
  },
  {
    name: "Ubuntu",
    version: "#ND",
  },
];

const devices = [
  {
    vendor: "#ND",
    model: "#ND",
    type: "#ND",
  },
  {
    vendor: "#ND",
    model: "#ND",
    type: "#ND",
  },
  {
    vendor: "#ND",
    model: "#ND",
    type: "#ND",
  },
  {
    vendor: "#ND",
    model: "#ND",
    type: "#ND",
  },
  {
    vendor: "#ND",
    model: "#ND",
    type: "#ND",
  },
];

const events = [
  {
    type: "pageView",
    element: "/",
    locale: "it-IT",
    hash: "arandomhashforuniquevisits",
    website_id: 1,
    browser_id: 1,
    engine_id: 1,
    os_id: 1,
    device_id: 1,
  },
  {
    type: "pageView",
    element: "/cross",
    locale: "it-IT",
    hash: "arandomhashforuniquevisits",
    website_id: 1,
    browser_id: 2,
    engine_id: 2,
    os_id: 2,
    device_id: 2,
  },
  {
    type: "pageView",
    element: "/fresh",
    locale: "it-IT",
    hash: "arandomhashforuniquevisits",
    website_id: 1,
    browser_id: 3,
    engine_id: 3,
    os_id: 3,
    device_id: 3,
  },
  {
    type: "pageView",
    element: "/fresh",
    locale: "it-IT",
    hash: "arandomhashforuniquevisits",
    website_id: 1,
    browser_id: 4,
    engine_id: 4,
    os_id: 4,
    device_id: 4,
  },
  {
    type: "pageView",
    element: "/fresh",
    locale: "en-GB",
    hash: "anotherrandomhashforuniquevisits",
    website_id: 1,
    browser_id: 5,
    engine_id: 5,
    os_id: 5,
    device_id: 5,
  },
];

exports.seed = async (knex) => {
  await knex("users")
    .del()
    .then(() => {
      return knex("users").insert(users);
    });

  await knex("websites")
    .del()
    .then(() => knex("websites").insert(websites));

  await knex("browsers")
    .del()
    .then(() => {
      return knex("browsers").insert(browsers);
    });

  await knex("engines")
    .del()
    .then(() => {
      return knex("engines").insert(engines);
    });

  await knex("oses")
    .del()
    .then(() => {
      return knex("oses").insert(oses);
    });

  await knex("devices")
    .del()
    .then(() => {
      return knex("devices").insert(devices);
    });

  await knex("events")
    .del()
    .then(() => {
      return knex("events").insert(events);
    });
};
