exports.up = function (knex) {
  return knex.schema.createTable("_websites", function (table) {
    table.increments("id");
    table.string("name", 255).notNullable();
    table.string("url", 255).notNullable().unique();
    table.string("seed", 255).notNullable().unique();
    table.boolean("shared").defaultTo(false);
    table.integer("user_id").references("id").inTable("_users");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("_websites");
};
