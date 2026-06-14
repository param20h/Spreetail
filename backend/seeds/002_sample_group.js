exports.seed = async function(knex) {
  const groupId = '99999999-9999-9999-9999-999999999999';

  await knex('groups').insert([
    { id: groupId, name: 'Flat 4B' }
  ]);

  await knex('group_members').insert([
    // Aisha: active from Jan 1, 2026
    {
      group_id: groupId,
      user_id: '11111111-1111-1111-1111-111111111111',
      joined_at: '2026-01-01',
      left_at: null
    },
    // Rohan: active from Jan 1, 2026
    {
      group_id: groupId,
      user_id: '22222222-2222-2222-2222-222222222222',
      joined_at: '2026-01-01',
      left_at: null
    },
    // Priya: active from Jan 1, 2026
    {
      group_id: groupId,
      user_id: '33333333-3333-3333-3333-333333333333',
      joined_at: '2026-01-01',
      left_at: null
    },
    // Meera: active from Jan 1, 2026, left March 31, 2026
    {
      group_id: groupId,
      user_id: '44444444-4444-4444-4444-444444444444',
      joined_at: '2026-01-01',
      left_at: '2026-03-31'
    },
    // Sam: active from Apr 8, 2026
    {
      group_id: groupId,
      user_id: '55555555-5555-5555-5555-555555555555',
      joined_at: '2026-04-08',
      left_at: null
    },
    // Dev: guest user active from Feb 1, 2026
    {
      group_id: groupId,
      user_id: '66666666-6666-6666-6666-666666666666',
      joined_at: '2026-02-01',
      left_at: null
    },
    // Kabir: guest user active from Mar 10, 2026
    {
      group_id: groupId,
      user_id: '77777777-7777-7777-7777-777777777777',
      joined_at: '2026-03-10',
      left_at: null
    }
  ]);
};
