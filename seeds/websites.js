const generateSeed = require("../utils/generate-seed");

exports.seed = (knex) => {
  return knex("websites")
    .del()
    .then(() => {
      return knex("websites").insert([
        {
          id: 1,
          name: "Renato Pozzi Website.",
          url: "https://renatopozzi.me",
          seed: generateSeed(),
          user_id: 1,
        },
      ]);
    });
};
