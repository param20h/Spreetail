const express = require('express');
const { body, query } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

// GET /groups/:id/expenses
router.get(
  '/groups/:id/expenses',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('start_date').optional().isDate(),
    query('end_date').optional().isDate(),
    query('paid_by').optional().isUUID(),
    query('currency').optional().isString()
  ],
  validate,
  async (req, res, next) => {
    const { id } = req.params;
    const { page = 1, limit = 20, start_date, end_date, paid_by, currency } = req.query;
    const offset = (page - 1) * limit;

    try {
      // Check group membership
      const membership = await db('group_members')
        .where({ group_id: id, user_id: req.user.id })
        .first();

      if (!membership) {
        return res.status(403).json({
          error: true,
          code: 'FORBIDDEN',
          message: 'You are not authorized to view this group expenses'
        });
      }

      let queryBuilder = db('expenses')
        .where({ group_id: id })
        .orderBy('date', 'desc')
        .orderBy('created_at', 'desc');

      if (start_date) {
        queryBuilder = queryBuilder.where('date', '>=', start_date);
      }
      if (end_date) {
        queryBuilder = queryBuilder.where('date', '<=', end_date);
      }
      if (paid_by) {
        queryBuilder = queryBuilder.where({ paid_by_user_id: paid_by });
      }
      if (currency) {
        queryBuilder = queryBuilder.where({ currency });
      }

      // Clone query to get total count
      const countQuery = queryBuilder.clone().clearOrder().count('id as total').first();

      const expenses = await queryBuilder.limit(limit).offset(offset);
      const { total } = await countQuery;

      // Fetch splits for all fetched expenses
      const expenseIds = expenses.map(e => e.id);
      let splits = [];
      if (expenseIds.length > 0) {
        splits = await db('expense_splits')
          .join('users', 'expense_splits.user_id', 'users.id')
          .whereIn('expense_id', expenseIds)
          .select(
            'expense_splits.*',
            'users.name as user_name',
            'users.email as user_email'
          );
      }

      // Attach splits to expenses
      const expensesWithSplits = expenses.map(e => {
        return {
          ...e,
          splits: splits.filter(s => s.expense_id === e.id)
        };
      });

      res.json({
        expenses: expensesWithSplits,
        pagination: {
          page,
          limit,
          total: parseInt(total, 10),
          pages: Math.ceil(parseInt(total, 10) / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /groups/:id/expenses
router.post(
  '/groups/:id/expenses',
  [
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 letter code'),
    body('paid_by').isUUID().withMessage('paid_by must be a valid user UUID'),
    body('date').isDate().withMessage('date must be a valid date'),
    body('split_type').isIn(['equal', 'unequal', 'percentage', 'share']).withMessage('Invalid split_type'),
    body('splits').isArray({ min: 1 }).withMessage('Splits must be a non-empty array'),
    body('splits.*.user_id').isUUID().withMessage('Each split user_id must be a UUID'),
    body('splits.*.amount').isNumeric().withMessage('Each split amount must be a number'),
    body('splits.*.percentage').optional({ nullable: true }).isNumeric(),
    body('splits.*.shares').optional({ nullable: true }).isInt()
  ],
  validate,
  async (req, res, next) => {
    const { id } = req.params;
    const { description, amount, currency, paid_by, date, split_type, splits, notes } = req.body;

    try {
      // Validate requester membership
      const membership = await db('group_members')
        .where({ group_id: id, user_id: req.user.id })
        .first();

      if (!membership) {
        return res.status(403).json({
          error: true,
          code: 'FORBIDDEN',
          message: 'You are not authorized to add expenses to this group'
        });
      }

      // Check if payer is a member of the group on the expense date
      const payerMembership = await db('group_members')
        .where({ group_id: id, user_id: paid_by })
        .first();
      
      if (!payerMembership) {
        return res.status(400).json({
          error: true,
          code: 'INVALID_PAYER',
          message: 'The selected payer is not a member of this group'
        });
      }

      // Verify split totals match total amount
      let sumSplits = 0;
      splits.forEach(s => {
        sumSplits += parseFloat(s.amount);
      });

      if (Math.abs(sumSplits - parseFloat(amount)) > 0.05) {
        return res.status(400).json({
          error: true,
          code: 'SPLIT_AMOUNT_MISMATCH',
          message: `Sum of split amounts (${sumSplits}) does not match total expense amount (${amount})`
        });
      }

      // Perform insert in transaction
      const result = await db.transaction(async (trx) => {
        const [expense] = await trx('expenses')
          .insert({
            group_id: id,
            description,
            amount: parseFloat(amount),
            currency: currency.toUpperCase(),
            paid_by_user_id: paid_by,
            date,
            split_type,
            notes
          })
          .returning('*');

        const splitsToInsert = splits.map(s => ({
          expense_id: expense.id,
          user_id: s.user_id,
          amount: parseFloat(s.amount),
          percentage: s.percentage !== undefined ? parseFloat(s.percentage) : null,
          shares: s.shares !== undefined ? parseInt(s.shares, 10) : null
        }));

        await trx('expense_splits').insert(splitsToInsert);

        return expense;
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /expenses/:id
router.put(
  '/expenses/:id',
  [
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 letter code'),
    body('paid_by').isUUID().withMessage('paid_by must be a valid user UUID'),
    body('date').isDate().withMessage('date must be a valid date'),
    body('split_type').isIn(['equal', 'unequal', 'percentage', 'share']).withMessage('Invalid split_type'),
    body('splits').isArray({ min: 1 }).withMessage('Splits must be a non-empty array'),
    body('splits.*.user_id').isUUID().withMessage('Each split user_id must be a UUID'),
    body('splits.*.amount').isNumeric().withMessage('Each split amount must be a number'),
    body('splits.*.percentage').optional({ nullable: true }).isNumeric(),
    body('splits.*.shares').optional({ nullable: true }).isInt()
  ],
  validate,
  async (req, res, next) => {
    const { id } = req.params;
    const { description, amount, currency, paid_by, date, split_type, splits, notes } = req.body;

    try {
      const expense = await db('expenses').where({ id }).first();
      if (!expense) {
        return res.status(404).json({
          error: true,
          code: 'EXPENSE_NOT_FOUND',
          message: 'Expense not found'
        });
      }

      // Check group membership
      const membership = await db('group_members')
        .where({ group_id: expense.group_id, user_id: req.user.id })
        .first();

      if (!membership) {
        return res.status(403).json({
          error: true,
          code: 'FORBIDDEN',
          message: 'You are not authorized to edit this expense'
        });
      }

      // Verify split totals match total amount
      let sumSplits = 0;
      splits.forEach(s => {
        sumSplits += parseFloat(s.amount);
      });

      if (Math.abs(sumSplits - parseFloat(amount)) > 0.05) {
        return res.status(400).json({
          error: true,
          code: 'SPLIT_AMOUNT_MISMATCH',
          message: `Sum of split amounts (${sumSplits}) does not match total expense amount (${amount})`
        });
      }

      const result = await db.transaction(async (trx) => {
        const [updatedExpense] = await trx('expenses')
          .where({ id })
          .update({
            description,
            amount: parseFloat(amount),
            currency: currency.toUpperCase(),
            paid_by_user_id: paid_by,
            date,
            split_type,
            notes,
            updated_at: trx.fn.now()
          })
          .returning('*');

        // Delete existing splits and re-insert
        await trx('expense_splits').where({ expense_id: id }).del();

        const splitsToInsert = splits.map(s => ({
          expense_id: id,
          user_id: s.user_id,
          amount: parseFloat(s.amount),
          percentage: s.percentage !== undefined ? parseFloat(s.percentage) : null,
          shares: s.shares !== undefined ? parseInt(s.shares, 10) : null
        }));

        await trx('expense_splits').insert(splitsToInsert);

        return updatedExpense;
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /expenses/:id
router.delete('/expenses/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const expense = await db('expenses').where({ id }).first();
    if (!expense) {
      return res.status(404).json({
        error: true,
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      });
    }

    // Check membership
    const membership = await db('group_members')
      .where({ group_id: expense.group_id, user_id: req.user.id })
      .first();

    if (!membership) {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: 'You are not authorized to delete this expense'
      });
    }

    await db('expenses').where({ id }).del();

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
