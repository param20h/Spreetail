const knex = require('knex');
const knexfile = require('./knexfile');
const db = knex(knexfile.development);

async function run() {
  try {
    console.log('--- Database Connection Check ---');
    const users = await db('users').select('id', 'name', 'email');
    console.log('Seeded Users in DB:', users.length);

    const groups = await db('groups').select('id', 'name');
    console.log('Seeded Groups in DB:', groups);

    for (const group of groups) {
      console.log(`\nMembers in group: ${group.name} (${group.id})`);
      const members = await db('group_members')
        .join('users', 'group_members.user_id', 'users.id')
        .where('group_members.group_id', group.id)
        .select('users.id', 'users.name', 'group_members.joined_at', 'group_members.left_at');
      console.log(members);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
