const express = require('express');
const { body } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

// GET /groups/:id/settlements
router.get('/:id/settlements', async (req, res, next) => {
  const { id } = req.params;

  try {
    // Check membership
    const membership = await db('group_members')
      .where({ group_id: id, user_id: req.user.id })
      .first();

    if (!membership) {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: 'You are not authorized to view settlements for this group'
      });
    }

    const settlements = await db('settlements')
      .join('users as payer', 'settlements.paid_by', 'payer.id')
      .join('users as receiver', 'settlements.paid_to', 'receiver.id')
      .where('settlements.group_id', id)
      .select(
        'settlements.*',
        'payer.name as paid_by_name',
        'receiver.name as paid_to_name'
      )
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc');

    res.json(settlements);
  } catch (err) {
    next(err);
  }
});

// POST /groups/:id/settlements
router.post(
  '/:id/settlements',
  [
    body('paid_by').isUUID().withMessage('paid_by must be a user UUID'),
    body('paid_to').isUUID().withMessage('paid_to must be a user UUID'),
    body('amount').isNumeric().withMessage('amount must be a number'),
    body('date').isDate().withMessage('date must be a valid date'),
    body('notes').optional().trim()
  ],
  validate,
  async (req, res, next) => {
    const { id } = req.params;
    const { paid_by, paid_to, amount, date, notes } = req.body;

    try {
      // Validate membership of requester
      const membership = await db('group_members')
        .where({ group_id: id, user_id: req.user.id })
        .first();

      if (!membership) {
        return res.status(403).json({
          error: true,
          code: 'FORBIDDEN',
          message: 'You are not authorized to record settlements in this group'
        });
      }

      // Verify that both payer and receiver are members of the group
      const memberships = await db('group_members')
        .where({ group_id: id })
        .whereIn('user_id', [paid_by, paid_to]);

      if (memberships.length < 2 && paid_by !== paid_to) {
        return res.status(400).json({
          error: true,
          code: 'INVALID_MEMBERS',
          message: 'One or both of the settlement participants are not members of this group'
        });
      }

      const [newSettlement] = await db('settlements')
        .insert({
          group_id: id,
          paid_by,
          paid_to,
          amount: parseFloat(amount),
          currency: 'INR', // default to INR for settlements
          date,
          notes
        })
        .returning('*');

      res.status(201).json(newSettlement);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
