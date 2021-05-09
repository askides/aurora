const { hash } = require("../utils/hash");

exports.seed = (knex) => {
  return knex("users")
    .del()
    .then(() => {
      return knex("users").insert({
        firstname: "Renato",
        lastname: "Pozzi",
        email: "info@renatopozzi.me",
        password: hash("password"),
      });
    });
};
