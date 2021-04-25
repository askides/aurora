exports.up = function (knex) {
  return knex.schema.createTable("events", function (table) {
    table.increments("id");
    table.string("type", 255).notNullable();
    table.text("element").notNullable();
    table.string("referrer", 255);
    table.string("hash", 255).notNullable();
    table.decimal("duration", 8, 2);
    table.integer("website_id").notNullable(); //.references("id").inTable("websites");
    table.integer("browser_id").notNullable(); //.references("id").inTable("browsers");
    table.integer("engine_id").notNullable(); //.references("id").inTable("engines");
    table.integer("os_id").notNullable(); //.references("id").inTable("oses");
    table.integer("device_id").notNullable(); //.references("id").inTable("devices");
    table.integer("locale_id").notNullable(); //.references("id").inTable("devices");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("events");
};
