exports.up = function (knex) {
  return knex.schema.createTable("_events", function (table) {
    table.increments("id");
    table.string("type", 255).notNullable();
    table.text("element").notNullable();
    table.string("locale", 255).notNullable();
    table.string("hash", 255).notNullable();
    table.integer("website_id").references("id").inTable("websites");
    table.integer("browser_id").references("id").inTable("browsers");
    table.integer("engine_id").references("id").inTable("engines");
    table.integer("os_id").references("id").inTable("oses");
    table.integer("device_id").references("id").inTable("devices");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("_events");
};
