const knex = require('knex');
const knexfile = require('./knexfile');
const db = knex(knexfile.development);

async function run() {
  try {
    console.log('--- Simulating Settlement Insert ---');
    const result = await db('settlements').insert({
      group_id: '81adf26a-648c-4ef8-9827-533e711e6353',
      paid_by: '22222222-2222-2222-2222-222222222222', // Rohan
      paid_to: '11111111-1111-1111-1111-111111111111', // Aisha
      amount: 44049.83,
      currency: 'INR',
      date: '2026-06-14',
      notes: 'Test settlement'
    }).returning('*');
    console.log('Insert Success:', result);
  } catch (err) {
    console.error('Insert Failed with Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
