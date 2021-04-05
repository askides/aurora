exports.up = function (knex) {
  return knex.schema.createTable("browsers", function (table) {
    table.increments("id");
    table.string("name", 255).notNullable();
    table.string("version", 255).notNullable();
    table.string("major", 255).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("browsers");
};
