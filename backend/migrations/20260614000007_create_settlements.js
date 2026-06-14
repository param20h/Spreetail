exports.up = function(knex) {
  return knex.schema.createTable('settlements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('group_id').references('id').inTable('groups').onDelete('CASCADE').notNullable();
    table.uuid('paid_by').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('paid_to').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.string('currency', 3).defaultTo('INR').notNullable();
    table.date('date').notNullable();
    table.text('notes');
    table.integer('import_row_ref');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('settlements');
};
