const users = require("../cypress/fixtures/users.json");
const websites = require("../cypress/fixtures/websites.json");
const browsers = require("../cypress/fixtures/browsers.json");
const engines = require("../cypress/fixtures/engines.json");
const oses = require("../cypress/fixtures/oses.json");
const devices = require("../cypress/fixtures/devices.json");
const events = require("../cypress/fixtures/events.json");

exports.seed = async (knex) => {
  // Setup created_at value for statistics calculations
  const now = new Date();
  const last2Days = new Date(new Date().setDate(new Date().getDate() - 2));
  const last14Days = new Date(new Date().setDate(new Date().getDate() - 14));
  const last2Months = new Date(new Date().setMonth(new Date().getMonth() - 2));
  const eventsMap = events.map((event) => {
    if (event.hash === "d95a6713a1b218918008263c1f825e547c22ee95e1124e8651c831396385b6b3") {
      return { ...event, created_at: last2Days }; // 14 Elements
    }

    if (event.hash === "9fe2b9426f057c5f41663b9e97092ffe9424db8f9a6ef9cfb307efa1783b9448") {
      return { ...event, created_at: last14Days }; // 5 Elements
    }

    if (event.hash === "432f3bb22d83c3f8804fca15a2737a9b7606014a253e5b3184c67f0c27ca0e49") {
      return { ...event, created_at: last2Months }; // 9 Elements
    }

    return { ...event, created_at: now }; // 22 Elements
  });

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
      return knex("events").insert(eventsMap);
    });
};
