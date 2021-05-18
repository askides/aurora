exports.up = function (knex) {
  return knex.schema.alterTable("locales", function (table) {
    table.string("local", 255).nullable().alter();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("locales", function (table) {
    table.string("local", 255).notNullable().alter();
  });
};
