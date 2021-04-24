exports.up = function (knex) {
  return knex.schema.createTable("locales", function (table) {
    table.increments("id");
    table.string("name", 255).notNullable();
    table.string("local", 255).notNullable();
    table.string("location", 255).notNullable();
    table.string("tag", 255).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("locales");
};
