exports.up = function(knex) {
  return knex.schema.createTable('expenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('group_id').references('id').inTable('groups').onDelete('CASCADE').notNullable();
    table.string('description', 500).notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.string('currency', 3).defaultTo('INR').notNullable();
    table.uuid('paid_by_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.date('date').notNullable();
    table.string('split_type').notNullable(); // equal, unequal, percentage, share
    table.text('notes');
    table.boolean('is_settlement').defaultTo(false).notNullable();
    table.boolean('is_refund').defaultTo(false).notNullable();
    table.integer('import_row_ref');
    table.uuid('import_session_id').references('id').inTable('import_sessions').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('expenses');
};
