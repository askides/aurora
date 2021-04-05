exports.up = function (knex) {
  return knex.schema.createTable("devices", function (table) {
    table.increments("id");
    table.string("vendor", 255).notNullable();
    table.string("model", 255).notNullable();
    table.string("type", 255).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("devices");
};
