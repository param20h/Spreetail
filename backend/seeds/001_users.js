const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Deletes ALL existing entries in dependent tables first to avoid FK errors
  await knex('import_anomalies').del();
  await knex('import_sessions').del();
  await knex('expense_splits').del();
  await knex('expenses').del();
  await knex('settlements').del();
  await knex('group_members').del();
  await knex('groups').del();
  await knex('users').del();
  await knex('fx_rates').del();

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);

  // We use specific UUIDs to keep things reproducible or let DB generate
  // Let's generate them in the script to link them easily in group_members and other tables.
  const users = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Aisha', email: 'aisha@flatmate.com', password_hash: hash, is_guest: false },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Rohan', email: 'rohan@flatmate.com', password_hash: hash, is_guest: false },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Priya', email: 'priya@flatmate.com', password_hash: hash, is_guest: false },
    { id: '44444444-4444-4444-4444-444444444444', name: 'Meera', email: 'meera@flatmate.com', password_hash: hash, is_guest: false },
    { id: '55555555-5555-5555-5555-555555555555', name: 'Sam', email: 'sam@flatmate.com', password_hash: hash, is_guest: false },
    { id: '66666666-6666-6666-6666-666666666666', name: 'Dev', email: 'dev@guest.com', password_hash: hash, is_guest: true },
    { id: '77777777-7777-7777-7777-777777777777', name: 'Kabir', email: 'kabir@guest.com', password_hash: hash, is_guest: true }
  ];

  await knex('users').insert(users);

  // Seed default FX rate
  await knex('fx_rates').insert([
    { id: '11111111-2222-3333-4444-555555555555', from_currency: 'USD', to_currency: 'INR', rate: 84.000000, effective_date: '2026-01-01' }
  ]);
};
