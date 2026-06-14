exports.up = function(knex) {
  return knex.schema.createTable('expense_splits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('expense_id').references('id').inTable('expenses').onDelete('CASCADE').notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.decimal('percentage', 5, 2);
    table.integer('shares');
    table.decimal('fx_rate_used', 12, 6);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('expense_splits');
};
