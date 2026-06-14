const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { parseImportCSV } = require('../services/importParser');
const { calculateSplits } = require('../utils/splitCalculator');

const router = express.Router();
router.use(auth);

// Multer setup for memory storage (file upload in memory)
const upload = multer({ storage: multer.memoryStorage() });

// CSV parsing helper
const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    }, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });
};

// Helper to find or create a user by name (for guests or normal users)
async function findOrCreateUserByName(name, trx) {
  const normalized = name.trim();
  const existing = await trx('users')
    .whereRaw('LOWER(name) = ?', [normalized.toLowerCase()])
    .first();

  if (existing) {
    return existing;
  }

  // Create guest user
  const emailName = normalized.toLowerCase().replace(/[^a-z0-9]/g, '');
  const [newGuest] = await trx('users')
    .insert({
      name: normalized,
      email: `${emailName}_guest@flatmate.com`,
      password_hash: 'guest_no_password',
      is_guest: true
    })
    .returning('*');

  return newGuest;
}

// Helper to ensure user is a group member
async function ensureGroupMembership(groupId, userId, joinedAt, trx) {
  const membership = await trx('group_members')
    .where({ group_id: groupId, user_id: userId })
    .first();

  if (!membership) {
    await trx('group_members').insert({
      group_id: groupId,
      user_id: userId,
      joined_at: joinedAt || '2026-01-01'
    });
  }
}

// POST /import/preview
router.post('/preview', upload.single('file'), async (req, res, next) => {
  const { group_id } = req.body;
  if (!req.file) {
    return res.status(400).json({
      error: true,
      code: 'FILE_REQUIRED',
      message: 'CSV file is required for import preview'
    });
  }
  if (!group_id) {
    return res.status(400).json({
      error: true,
      code: 'GROUP_REQUIRED',
      message: 'Group ID is required'
    });
  }

  try {
    // 1. Fetch group members
    const members = await db('group_members')
      .join('users', 'group_members.user_id', 'users.id')
      .where('group_members.group_id', group_id)
      .select('users.name', 'group_members.joined_at', 'group_members.left_at');

    // 2. Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    const rawRows = await parseCSV(req.file.buffer);

    // 3. Process CSV rows
    const report = parseImportCSV(rawRows, members);

    // 4. Save import session in DB under status = 'preview'
    const [session] = await db('import_sessions')
      .insert({
        filename: req.file.originalname,
        status: 'preview',
        total_rows: rawRows.length,
        parsed_rows_json: JSON.stringify(report.parsed_rows)
      })
      .returning('*');

    // 5. Save anomalies in DB linked to session
    if (report.anomalies.length > 0) {
      const anomaliesToInsert = report.anomalies.map(a => ({
        import_session_id: session.id,
        row_number: a.row,
        field: a.field,
        issue_type: a.issue_type,
        description: a.action,
        raw_value: String(a.raw_value || ''),
        detected_value: String(a.detected_value || ''),
        action_taken: a.action,
        requires_approval: a.requires_approval
      }));
      await db('import_anomalies').insert(anomaliesToInsert);
    }

    res.json({
      session_id: session.id,
      rows_total: report.rows_total,
      rows_ok: report.rows_ok,
      anomalies: report.anomalies,
      requires_approval: report.requires_approval,
      parsed_rows: report.parsed_rows
    });
  } catch (err) {
    next(err);
  }
});

// POST /import/confirm
router.post('/confirm', async (req, res, next) => {
  const { session_id, resolutions = {}, fx_rate, group_id } = req.body;

  if (!session_id) {
    return res.status(400).json({
      error: true,
      code: 'SESSION_REQUIRED',
      message: 'Session ID is required'
    });
  }
  if (!group_id) {
    return res.status(400).json({
      error: true,
      code: 'GROUP_REQUIRED',
      message: 'Group ID is required'
    });
  }

  try {
    // 1. Fetch preview session
    const session = await db('import_sessions').where({ id: session_id }).first();
    if (!session) {
      return res.status(404).json({
        error: true,
        code: 'SESSION_NOT_FOUND',
        message: 'Import session not found'
      });
    }

    if (session.status !== 'preview') {
      return res.status(400).json({
        error: true,
        code: 'INVALID_SESSION_STATUS',
        message: `Import session has status ${session.status} and cannot be confirmed`
      });
    }

    const parsedRows = JSON.parse(session.parsed_rows_json || '[]');
    let importedCount = 0;
    let skippedCount = 0;
    const resolutionLog = [];

    // Save FX rate in fx_rates table if provided
    if (fx_rate) {
      const parsedRate = parseFloat(fx_rate);
      if (!isNaN(parsedRate) && parsedRate > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        // Upsert rate
        const existing = await db('fx_rates')
          .where({ from_currency: 'USD', to_currency: 'INR', effective_date: todayStr })
          .first();

        if (existing) {
          await db('fx_rates').where({ id: existing.id }).update({ rate: parsedRate });
        } else {
          await db('fx_rates').insert({
            from_currency: 'USD',
            to_currency: 'INR',
            rate: parsedRate,
            effective_date: todayStr
          });
        }
      }
    }

    // 2. Perform confirm insertions in a Transaction
    await db.transaction(async (trx) => {
      for (const row of parsedRows) {
        const rowNumStr = String(row.row_number);
        const resolution = resolutions[rowNumStr];

        // If explicitly rejected, skip importing
        if (resolution === 'reject' || (resolution && resolution.action === 'reject')) {
          skippedCount++;
          resolutionLog.push({ row: row.row_number, action: 'Skip', issue: 'User rejected import' });
          continue;
        }

        // Apply overrides if provided in resolution
        let finalPayerName = row.paid_by;
        let finalAmount = row.amount;
        let finalDescription = row.description;
        let finalDate = row.date;
        let finalSplitType = row.split_type;
        let finalCurrency = row.currency;
        let finalParticipants = [...row.participants];
        let finalDetails = { ...row.details };

        if (resolution && typeof resolution === 'object') {
          if (resolution.paid_by) finalPayerName = resolution.paid_by;
          if (resolution.amount) finalAmount = parseFloat(resolution.amount);
          if (resolution.description) finalDescription = resolution.description;
          if (resolution.date) finalDate = resolution.date;
          if (resolution.split_type) finalSplitType = resolution.split_type;
          if (resolution.currency) finalCurrency = resolution.currency;
          if (resolution.participants) finalParticipants = resolution.participants;
          if (resolution.details) finalDetails = resolution.details;
        }

        // Check if payer is available. If missing payer and user assigned one:
        if (!finalPayerName) {
          skippedCount++;
          resolutionLog.push({ row: row.row_number, action: 'Skip', issue: 'No payer assigned' });
          continue;
        }

        // Ensure payer exists in users table (find or create guest)
        const payerUser = await findOrCreateUserByName(finalPayerName, trx);
        // Ensure payer is group member on date
        await ensureGroupMembership(group_id, payerUser.id, finalDate, trx);

        // Ensure all participants exist and are members
        const participantUserIds = [];
        for (const pName of finalParticipants) {
          const pUser = await findOrCreateUserByName(pName, trx);
          await ensureGroupMembership(group_id, pUser.id, finalDate, trx);
          participantUserIds.push(pUser.id);
        }

        if (row.is_settlement) {
          // Find target recipient. For settlements, splits usually have exactly one person
          const paidToName = finalParticipants[0] || 'Aisha';
          const paidToUser = await findOrCreateUserByName(paidToName, trx);
          await ensureGroupMembership(group_id, paidToUser.id, finalDate, trx);

          await trx('settlements').insert({
            group_id,
            paid_by: payerUser.id,
            paid_to: paidToUser.id,
            amount: finalAmount,
            currency: finalCurrency,
            date: finalDate,
            notes: row.notes,
            import_row_ref: row.row_number
          });
          
          importedCount++;
          resolutionLog.push({ row: row.row_number, action: 'Imported Settlement', issue: 'Imported successfully' });
        } else {
          // It is an expense. Compute splits based on final split type
          // Map participant names to user_ids
          const detailsMapByUserId = {};
          for (const name of Object.keys(finalDetails)) {
            const u = await findOrCreateUserByName(name, trx);
            detailsMapByUserId[u.id] = finalDetails[name];
          }

          let splitsList = [];
          try {
            splitsList = calculateSplits(finalAmount, finalSplitType, participantUserIds, detailsMapByUserId);
          } catch (err) {
            skippedCount++;
            resolutionLog.push({ row: row.row_number, action: 'Skip', issue: `Split computation error: ${err.message}` });
            continue;
          }

          const [expense] = await trx('expenses')
            .insert({
              group_id,
              description: finalDescription,
              amount: finalAmount,
              currency: finalCurrency,
              paid_by_user_id: payerUser.id,
              date: finalDate,
              split_type: finalSplitType,
              notes: row.notes,
              is_settlement: false,
              is_refund: row.is_refund || false,
              import_row_ref: row.row_number,
              import_session_id: session_id
            })
            .returning('*');

          const finalFxRate = finalCurrency === 'USD' ? (parseFloat(fx_rate) || 84.0) : 1.0;

          const splitsToInsert = splitsList.map(s => ({
            expense_id: expense.id,
            user_id: s.user_id,
            amount: s.amount,
            percentage: s.percentage,
            shares: s.shares,
            fx_rate_used: finalFxRate
          }));

          await trx('expense_splits').insert(splitsToInsert);
          
          importedCount++;
          resolutionLog.push({ row: row.row_number, action: 'Imported Expense', issue: 'Imported successfully' });
        }
      }

      // 3. Update import session in DB
      await trx('import_sessions')
        .where({ id: session_id })
        .update({
          status: 'confirmed',
          imported_rows: importedCount,
          skipped_rows: skippedCount,
          fx_rate_used: fx_rate ? parseFloat(fx_rate) : null,
          imported_at: trx.fn.now()
        });

      // 4. Update anomalies as resolved/approved
      await trx('import_anomalies')
        .where({ import_session_id: session_id })
        .update({
          approved_by: req.user.id,
          approved_at: trx.fn.now()
        });
    });

    res.json({
      session_id,
      total_rows: session.total_rows,
      imported_rows: importedCount,
      skipped_rows: skippedCount,
      fx_rate_used: fx_rate ? parseFloat(fx_rate) : null,
      resolution_log: resolutionLog,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// GET /import/:session_id/report
router.get('/:session_id/report', async (req, res, next) => {
  const { session_id } = req.params;

  try {
    const session = await db('import_sessions').where({ id: session_id }).first();
    if (!session) {
      return res.status(404).json({
        error: true,
        code: 'SESSION_NOT_FOUND',
        message: 'Import session not found'
      });
    }

    const anomalies = await db('import_anomalies')
      .where({ import_session_id: session_id })
      .orderBy('row_number', 'asc');

    res.json({
      session,
      anomalies
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
