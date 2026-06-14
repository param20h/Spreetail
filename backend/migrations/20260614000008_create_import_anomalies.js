exports.up = function(knex) {
  return knex.schema.createTable('import_anomalies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('import_session_id').references('id').inTable('import_sessions').onDelete('CASCADE').notNullable();
    table.integer('row_number').notNullable();
    table.string('field');
    table.string('issue_type').notNullable();
    table.text('description');
    table.text('raw_value');
    table.text('detected_value');
    table.string('action_taken');
    table.boolean('requires_approval').defaultTo(false).notNullable();
    table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('import_anomalies');
};
