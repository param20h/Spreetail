const express = require('express');
const { query } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { calculateBalances } = require('../services/balanceEngine');

const router = express.Router();

router.use(auth);

// Helper to pull balance-related data from DB and run balanceEngine
async function getGroupBalanceData(groupId, asOfDate = null) {
  // 1. Fetch group members
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

  // 2. Fetch expenses
  let expensesQuery = db('expenses').where({ group_id: groupId });
  if (asOfDate) {
    expensesQuery = expensesQuery.where('date', '<=', asOfDate);
  }
  const expenses = await expensesQuery;

  // 3. Fetch splits
  const expenseIds = expenses.map(e => e.id);
  let splits = [];
  if (expenseIds.length > 0) {
    splits = await db('expense_splits').whereIn('expense_id', expenseIds);
  }

  // 4. Fetch settlements
  let settlementsQuery = db('settlements').where({ group_id: groupId });
  if (asOfDate) {
    settlementsQuery = settlementsQuery.where('date', '<=', asOfDate);
  }
  const settlements = await settlementsQuery;

  // 5. Fetch FX Rates
  const fxRates = await db('fx_rates');

  return {
    expenses,
    splits,
    settlements,
    members,
    fxRates
  };
}

// GET /groups/:id/balance
router.get(
  '/:id/balance',
  [
    query('as_of_date').optional().isDate().withMessage('as_of_date must be a valid date')
  ],
  validate,
  async (req, res, next) => {
    const { id } = req.params;
    const { as_of_date } = req.query;

    try {
      // Check membership
      const membership = await db('group_members')
        .where({ group_id: id, user_id: req.user.id })
        .first();

      if (!membership) {
        return res.status(403).json({
          error: true,
          code: 'FORBIDDEN',
          message: 'You are not authorized to view balances for this group'
        });
      }

      const { expenses, splits, settlements, members, fxRates } = await getGroupBalanceData(id, as_of_date);

      const balanceReport = calculateBalances(expenses, splits, settlements, members, fxRates, as_of_date);

      res.json({
        per_user_net: balanceReport.per_user_net,
        settlements_needed: balanceReport.settlements_needed,
        as_of: balanceReport.as_of
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /groups/:id/balance/breakdown (itemized per-expense breakdown)
router.get(
  '/:id/balance/breakdown',
  [
    query('as_of_date').optional().isDate().withMessage('as_of_date must be a valid date')
  ],
  validate,
  async (req, res, next) => {
    const { id } = req.params;
    const { as_of_date } = req.query;

    try {
      // Check membership
      const membership = await db('group_members')
        .where({ group_id: id, user_id: req.user.id })
        .first();

      if (!membership) {
        return res.status(403).json({
          error: true,
          code: 'FORBIDDEN',
          message: 'You are not authorized to view breakdowns for this group'
        });
      }

      const { expenses, splits, settlements, members, fxRates } = await getGroupBalanceData(id, as_of_date);

      const balanceReport = calculateBalances(expenses, splits, settlements, members, fxRates, as_of_date);

      // Return the full breakdown report (includes credits, debits, itemized breakdown array per user)
      res.json(balanceReport.breakdown);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
export_helpers = { getGroupBalanceData };
