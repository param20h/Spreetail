const express = require('express');
const { body, query } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

// GET /fx-rates/current
router.get(
  '/current',
  [
    query('from').isLength({ min: 3, max: 3 }).withMessage('from currency must be 3 letters'),
    query('to').isLength({ min: 3, max: 3 }).withMessage('to currency must be 3 letters')
  ],
  validate,
  async (req, res, next) => {
    const { from, to } = req.query;

    try {
      const rate = await db('fx_rates')
        .where({
          from_currency: from.toUpperCase(),
          to_currency: to.toUpperCase()
        })
        .orderBy('effective_date', 'desc')
        .first();

      if (!rate) {
        // Return a default rate or 404
        if (from.toUpperCase() === 'USD' && to.toUpperCase() === 'INR') {
          return res.json({ rate: 84.00, effective_date: 'default' });
        }
        return res.status(404).json({
          error: true,
          code: 'FX_RATE_NOT_FOUND',
          message: `Exchange rate from ${from} to ${to} not found`
        });
      }

      res.json({
        rate: parseFloat(rate.rate),
        effective_date: rate.effective_date
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /fx-rates
router.post(
  '/',
  [
    body('from').isLength({ min: 3, max: 3 }).withMessage('from currency must be 3 letters'),
    body('to').isLength({ min: 3, max: 3 }).withMessage('to currency must be 3 letters'),
    body('rate').isNumeric().withMessage('rate must be a number'),
    body('effective_date').isDate().withMessage('effective_date must be a valid date')
  ],
  validate,
  async (req, res, next) => {
    const { from, to, rate, effective_date } = req.body;

    try {
      // Upsert rate: check if (from, to, date) already exists
      const existing = await db('fx_rates')
        .where({
          from_currency: from.toUpperCase(),
          to_currency: to.toUpperCase(),
          effective_date
        })
        .first();

      let result;
      if (existing) {
        [result] = await db('fx_rates')
          .where({ id: existing.id })
          .update({ rate: parseFloat(rate) })
          .returning('*');
      } else {
        [result] = await db('fx_rates')
          .insert({
            from_currency: from.toUpperCase(),
            to_currency: to.toUpperCase(),
            rate: parseFloat(rate),
            effective_date
          })
          .returning('*');
      }

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
