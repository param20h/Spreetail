const knex = require('knex');
const knexfile = require('./knexfile');
const db = knex(knexfile.development);
const { calculateBalances } = require('./src/services/balanceEngine');

async function getGroupBalanceData(groupId) {
  const members = await db('group_members')
    .join('users', 'group_members.user_id', 'users.id')
    .where('group_members.group_id', groupId)
    .select(
      'users.id as user_id',
      'users.name',
      'users.email',
      'group_members.joined_at',
      'group_members.left_at'
    );

  const expenses = await db('expenses').where({ group_id: groupId });

  const expenseIds = expenses.map(e => e.id);
  let splits = [];
  if (expenseIds.length > 0) {
    splits = await db('expense_splits').whereIn('expense_id', expenseIds);
  }

  const settlements = await db('settlements').where({ group_id: groupId });
  const fxRates = await db('fx_rates');

  return {
    expenses,
    splits,
    settlements,
    members,
    fxRates
  };
}

async function run() {
  const groupId = '81adf26a-648c-4ef8-9827-533e711e6353'; // group "prime"
  try {
    console.log(`--- Calculating balances for group: ${groupId} ---`);
    const { expenses, splits, settlements, members, fxRates } = await getGroupBalanceData(groupId);
    
    console.log('Total Expenses:', expenses.length);
    console.log('Total Splits:', splits.length);
    console.log('Total Settlements:', settlements.length);
    console.log('Members:', members.length);

    const balanceReport = calculateBalances(expenses, splits, settlements, members, fxRates);
    
    console.log('\n--- Per User Net Balances ---');
    console.log(balanceReport.per_user_net);

    console.log('\n--- Suggested Settlements ---');
    console.log(balanceReport.settlements_needed);
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
