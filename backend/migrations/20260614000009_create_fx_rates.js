exports.up = function(knex) {
  return knex.schema.createTable('fx_rates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('from_currency', 3).notNullable();
    table.string('to_currency', 3).notNullable();
    table.decimal('rate', 12, 6).notNullable();
    table.date('effective_date').notNullable();
    table.unique(['from_currency', 'to_currency', 'effective_date']);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('fx_rates');
};
