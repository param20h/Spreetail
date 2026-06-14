exports.up = function(knex) {
  return knex.schema.createTable('import_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('filename').notNullable();
    table.string('status').notNullable().defaultTo('preview'); // preview, confirmed, failed
    table.integer('total_rows').defaultTo(0);
    table.integer('imported_rows').defaultTo(0);
    table.integer('skipped_rows').defaultTo(0);
    table.decimal('fx_rate_used', 12, 6);
    table.text('parsed_rows_json'); // Stores parsed preview rows
    table.timestamp('imported_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('import_sessions');
};
