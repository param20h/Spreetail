/**
 * FX Rate Service – database-backed CRUD for foreign-exchange rates.
 */

'use strict';

const db = require('../config/database');

/**
 * Create (or upsert) an FX rate for a given currency pair and date.
 *
 * If a rate already exists for the same (from, to, effective_date) triple
 * it is updated in place rather than duplicated.
 *
 * @param {string} fromCurrency  Source currency code (e.g. 'USD').
 * @param {string} toCurrency    Target currency code (e.g. 'EUR').
 * @param {number} rate          Conversion rate (1 fromCurrency = rate toCurrency).
 * @param {string|Date} effectiveDate  Date from which this rate is effective.
 * @returns {Promise<object>}    The created / updated row.
 */
async function createRate(fromCurrency, toCurrency, rate, effectiveDate) {
  const [result] = await db('fx_rates')
    .insert({
      from_currency: fromCurrency.toUpperCase(),
      to_currency: toCurrency.toUpperCase(),
      rate,
      effective_date: effectiveDate,
    })
    .onConflict(['from_currency', 'to_currency', 'effective_date'])
    .merge()
    .returning('*');

  return result;
}

/**
 * Get the most recent rate for a currency pair.
 *
 * If no direct rate exists the reverse pair is looked up and the rate is
 * inverted (1 / rate) so the caller always receives results oriented in
 * the requested direction.
 *
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @returns {Promise<object|null>}  Rate row (with optional `is_inverted` flag),
 *                                  or null when no rate is found at all.
 */
async function getCurrentRate(fromCurrency, toCurrency) {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // Direct lookup
  const rate = await db('fx_rates')
    .where({ from_currency: from, to_currency: to })
    .orderBy('effective_date', 'desc')
    .first();

  if (rate) return rate;

  // Reverse lookup
  const reverseRate = await db('fx_rates')
    .where({ from_currency: to, to_currency: from })
    .orderBy('effective_date', 'desc')
    .first();

  if (reverseRate) {
    return {
      ...reverseRate,
      from_currency: from,
      to_currency: to,
      rate: parseFloat((1 / reverseRate.rate).toFixed(6)),
      is_inverted: true,
    };
  }

  return null;
}

/**
 * Get the rate effective on or before a given date for a currency pair.
 *
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {string|Date} date
 * @returns {Promise<object|null>}
 */
async function getRateForDate(fromCurrency, toCurrency, date) {
  const rate = await db('fx_rates')
    .where({
      from_currency: fromCurrency.toUpperCase(),
      to_currency: toCurrency.toUpperCase(),
    })
    .where('effective_date', '<=', date)
    .orderBy('effective_date', 'desc')
    .first();

  return rate || null;
}

module.exports = { createRate, getCurrentRate, getRateForDate };
