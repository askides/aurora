exports.seed = (knex) => {
  return knex("websites")
    .del()
    .then(() => {
      return knex("websites").insert({
        name: "Renato Pozzi Website.",
        url: "https://renatopozzi.me",
        seed: "40551333ba09839f5287a7a6aa2f73fe",
        user_id: 1,
      });
    });
};
