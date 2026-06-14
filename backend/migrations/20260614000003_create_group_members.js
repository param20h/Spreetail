exports.up = function(knex) {
  return knex.schema.createTable('group_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('group_id').references('id').inTable('groups').onDelete('CASCADE').notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.date('joined_at').notNullable();
    table.date('left_at');
    table.unique(['group_id', 'user_id']);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('group_members');
};
