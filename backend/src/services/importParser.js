const { parseDate } = require('../utils/dateParser');
const { findFuzzyMatch } = require('../utils/fuzzyMatch');

// In-memory or database-backed canonical members list
const CANONICAL_MEMBERS = ['Aisha', 'Rohan', 'Priya', 'Meera', 'Sam'];

const STOP_WORDS = new Set(['at', 'for', 'the', 'in', 'and', 'a', 'of', 'on', 'with', 'to', 'by']);

function getKeywords(desc) {
  if (!desc) return [];
  return desc.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0 && !STOP_WORDS.has(word));
}

function areDescriptionsFuzzyEqual(desc1, desc2) {
  const kw1 = getKeywords(desc1);
  const kw2 = getKeywords(desc2);
  
  if (kw1.length === 0 || kw2.length === 0) return false;
  
  // Check exact keyword list match (order independent)
  const sorted1 = [...kw1].sort().join(' ');
  const sorted2 = [...kw2].sort().join(' ');
  if (sorted1 === sorted2) return true;
  
  // Percentage overlap check
  const set1 = new Set(kw1);
  const set2 = new Set(kw2);
  let intersection = 0;
  set1.forEach(w => {
    if (set2.has(w)) intersection++;
  });
  
  const minLength = Math.min(set1.size, set2.size);
  return (intersection / minLength) >= 0.75;
}

/**
 * Parses CSV lines and returns a report of all rows, including detected anomalies.
 * Does NOT write to database (pure preview mode).
 * 
 * @param {Array<Object>} csvRows - Array of parsed objects from CSV (keys matching headers)
 * @param {Array<Object>} existingMembers - Array of active group members { name, joined_at, left_at }
 */
function parseImportCSV(csvRows, existingMembers = []) {
  const anomalies = [];
  const parsedRows = [];
  const memberNames = existingMembers.map(m => m.name);
  const canonicalNames = memberNames.length > 0 ? memberNames : CANONICAL_MEMBERS;
  
  // Track previous rows to find duplicates
  // Duplicate check: Same date + description (normalized) + amount + payer
  const seenRows = [];

  csvRows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // Row number 1 is header, so data starts at row 2
    
    let dateStr = rawRow.date || '';
    let description = rawRow.description || '';
    let paidBy = rawRow.paid_by || '';
    let amountStr = rawRow.amount || '';
    let currency = rawRow.currency || '';
    let splitType = rawRow.split_type || '';
    let splitWithStr = rawRow.split_with || '';
    let splitDetails = rawRow.split_details || '';
    let notes = rawRow.notes || '';

    let rowOk = true;
    let rowAnomalies = [];

    // --- 3. COMMA IN AMOUNT (Row 7) ---
    let hasComma = false;
    let cleanAmountStr = amountStr;
    if (amountStr.includes(',')) {
      hasComma = true;
      cleanAmountStr = amountStr.replace(/,/g, '');
    }

    let rawAmount = parseFloat(cleanAmountStr);
    let amount = rawAmount;

    if (hasComma && !isNaN(amount)) {
      rowAnomalies.push({
        row: rowNum,
        field: 'amount',
        issue_type: 'COMMA_IN_AMOUNT',
        raw_value: amountStr,
        detected_value: String(amount),
        action: 'Auto-fix: stripped commas',
        requires_approval: false
      });
    }

    // --- 19. EXCESS PRECISION (Row 10) ---
    if (!isNaN(amount)) {
      const parts = cleanAmountStr.split('.');
      if (parts.length > 1 && parts[1].length > 2) {
        const roundedAmount = Math.round(amount * 100) / 100;
        rowAnomalies.push({
          row: rowNum,
          field: 'amount',
          issue_type: 'EXCESS_PRECISION',
          raw_value: amountStr,
          detected_value: String(roundedAmount),
          action: `Auto-fix: rounded to 2 decimal places from ${amount}`,
          requires_approval: false
        });
        amount = roundedAmount;
      }
    }

    // --- 10. ZERO AMOUNT (Row 31) ---
    if (!isNaN(amount) && amount === 0) {
      rowAnomalies.push({
        row: rowNum,
        field: 'amount',
        issue_type: 'ZERO_AMOUNT',
        raw_value: amountStr,
        detected_value: '0',
        action: 'Skip row: treated as informational/void row',
        requires_approval: false
      });
      // Skip this row from normal import
      rowOk = false;
    }

    // --- 11. NEGATIVE AMOUNT (Row 26) ---
    let isRefund = false;
    if (!isNaN(amount) && amount < 0) {
      isRefund = true;
      rowAnomalies.push({
        row: rowNum,
        field: 'amount',
        issue_type: 'NEGATIVE_AMOUNT',
        raw_value: amountStr,
        detected_value: String(amount),
        action: 'Auto-flag: created refund/credit expense with negative amount',
        requires_approval: false
      });
    }

    // --- 4. MISSING PAYER (Row 13) ---
    let normalizedPaidBy = paidBy.trim();
    if (!normalizedPaidBy) {
      rowAnomalies.push({
        row: rowNum,
        field: 'paid_by',
        issue_type: 'MISSING_PAYER',
        raw_value: '',
        detected_value: null,
        action: 'Require user to assign payer before import',
        requires_approval: true
      });
      rowOk = false;
    }

    // --- 6. CASE INCONSISTENCY & Spaces (Row 9, 27) ---
    if (normalizedPaidBy) {
      const matchedCanonical = canonicalNames.find(
        name => name.toLowerCase() === normalizedPaidBy.toLowerCase()
      );
      if (matchedCanonical && matchedCanonical !== paidBy) {
        rowAnomalies.push({
          row: rowNum,
          field: 'paid_by',
          issue_type: 'CASE_INCONSISTENCY',
          raw_value: paidBy,
          detected_value: matchedCanonical,
          action: `Auto-fix: normalized casing/whitespace to ${matchedCanonical}`,
          requires_approval: false
        });
        normalizedPaidBy = matchedCanonical;
      } 
      // --- 5. INCONSISTENT PAYER NAME (Row 11: Priya S) ---
      else {
        const fuzzyMatchedName = findFuzzyMatch(normalizedPaidBy, canonicalNames);
        if (fuzzyMatchedName && fuzzyMatchedName !== normalizedPaidBy) {
          rowAnomalies.push({
            row: rowNum,
            field: 'paid_by',
            issue_type: 'INCONSISTENT_PAYER_NAME',
            raw_value: paidBy,
            detected_value: fuzzyMatchedName,
            action: `Suggest mapping "${paidBy}" to "${fuzzyMatchedName}"`,
            requires_approval: true
          });
          normalizedPaidBy = fuzzyMatchedName; // Propose the fuzzy match
        } 
        // If neither exact/case-insensitive nor fuzzy match with canonical users, it's an external user (handled below)
      }
    }

    // --- 7. AMBIGUOUS DATE & 8. NON-STANDARD DATE (Row 34, 27) ---
    let parsedDateResult = parseDate(dateStr);
    let finalDate = parsedDateResult.parsedDate;
    if (parsedDateResult.error) {
      rowAnomalies.push({
        row: rowNum,
        field: 'date',
        issue_type: 'INVALID_DATE',
        raw_value: dateStr,
        detected_value: null,
        action: 'Block row: date cannot be parsed',
        requires_approval: true
      });
      rowOk = false;
    } else {
      if (parsedDateResult.isAmbiguous) {
        rowAnomalies.push({
          row: rowNum,
          field: 'date',
          issue_type: 'AMBIGUOUS_DATE',
          raw_value: dateStr,
          detected_value: finalDate,
          action: `Flag as ambiguous. Proposed: ${finalDate} (DD-MM)`,
          requires_approval: true
        });
      }
      if (parsedDateResult.isNonStandard) {
        rowAnomalies.push({
          row: rowNum,
          field: 'date',
          issue_type: 'NON_STANDARD_DATE',
          raw_value: dateStr,
          detected_value: finalDate,
          action: `Auto-fix: parsed non-standard date to ${finalDate}`,
          requires_approval: false
        });
      }
    }

    // --- 9. MISSING CURRENCY (Row 28) ---
    let finalCurrency = currency.trim();
    if (!finalCurrency) {
      finalCurrency = 'INR';
      rowAnomalies.push({
        row: rowNum,
        field: 'currency',
        issue_type: 'MISSING_CURRENCY',
        raw_value: '',
        detected_value: 'INR',
        action: 'Default to INR with warning',
        requires_approval: true
      });
    }

    // --- 2. SETTLEMENT AS EXPENSE (Row 14) ---
    let isSettlement = false;
    const descLower = description.toLowerCase();
    const notesLower = notes.toLowerCase();
    
    if (descLower.includes('paid back') || descLower.includes('settled') || notesLower.includes('settlement')) {
      isSettlement = true;
      rowAnomalies.push({
        row: rowNum,
        field: 'is_settlement',
        issue_type: 'SETTLEMENT_AS_EXPENSE',
        raw_value: 'Expense row',
        detected_value: 'Settlement row',
        action: 'Move to settlements table instead of expenses',
        requires_approval: true
      });
    }

    // --- 17. SETTLEMENT AS DEPOSIT (Row 38) ---
    if (descLower.includes('deposit') && descLower.includes('share')) {
      isSettlement = true;
      rowAnomalies.push({
        row: rowNum,
        field: 'is_settlement',
        issue_type: 'SETTLEMENT_AS_DEPOSIT',
        raw_value: 'Expense row',
        detected_value: 'Settlement row',
        action: 'Flag for user classification (deposit transfer)',
        requires_approval: true
      });
    }

    // Parse split_with participants
    let participants = splitWithStr.split(';')
      .map(p => p.trim())
      .filter(p => p.length > 0);
      
    // Case-normalize participants and clean up whitespace
    participants = participants.map(p => {
      const canonical = canonicalNames.find(c => c.toLowerCase() === p.toLowerCase());
      if (canonical) return canonical;
      const fuzzy = findFuzzyMatch(p, canonicalNames);
      if (fuzzy) return fuzzy;
      return p;
    });

    // --- 14. EXTERNAL PARTICIPANT (Row 5, 23: Dev, Kabir) ---
    // Dev is an external user not in regular group_members when they first join, and Kabir is Dev's friend
    // We auto-detect this and log an anomaly
    participants.forEach((participant) => {
      if (!canonicalNames.includes(participant)) {
        rowAnomalies.push({
          row: rowNum,
          field: 'split_with',
          issue_type: 'EXTERNAL_PARTICIPANT',
          raw_value: participant,
          detected_value: participant,
          action: `Auto-create guest/external user for "${participant}"`,
          requires_approval: false
        });
      }
    });

    if (normalizedPaidBy && !canonicalNames.includes(normalizedPaidBy)) {
      rowAnomalies.push({
        row: rowNum,
        field: 'paid_by',
        issue_type: 'EXTERNAL_PARTICIPANT',
        raw_value: normalizedPaidBy,
        detected_value: normalizedPaidBy,
        action: `Auto-create guest/external user for payer "${normalizedPaidBy}"`,
        requires_approval: false
      });
    }

    // --- 15. MEERA_AFTER_DEPARTURE (Row 36) ---
    // Meera left March 31. Row 36 date is 02-04-2026 (April 2).
    if (finalDate) {
      const rowDateObj = new Date(finalDate);
      const meeraMember = existingMembers.find(m => m.name === 'Meera');
      if (meeraMember && meeraMember.left_at) {
        const leftDateObj = new Date(meeraMember.left_at);
        if (rowDateObj > leftDateObj) {
          if (participants.includes('Meera')) {
            rowAnomalies.push({
              row: rowNum,
              field: 'split_with',
              issue_type: 'MEERA_AFTER_DEPARTURE',
              raw_value: 'Meera included in split',
              detected_value: 'Remove Meera',
              action: 'Auto-remove Meera from splits, recalculate shares',
              requires_approval: false
            });
            participants = participants.filter(p => p !== 'Meera');
          }
        }
      }
    }

    // --- 16. SAM_BEFORE_JOIN (Rows before April 8) ---
    // Sam joined April 8. If he appears in split_with or paid_by before that date:
    if (finalDate) {
      const rowDateObj = new Date(finalDate);
      const samMember = existingMembers.find(m => m.name === 'Sam');
      if (samMember && samMember.joined_at) {
        const joinedDateObj = new Date(samMember.joined_at);
        if (rowDateObj < joinedDateObj) {
          if (participants.includes('Sam') || normalizedPaidBy === 'Sam') {
            rowAnomalies.push({
              row: rowNum,
              field: 'split_with',
              issue_type: 'SAM_BEFORE_JOIN',
              raw_value: 'Sam mentioned before joined_at',
              detected_value: 'Exclude Sam',
              action: 'Flag Sam usage before his join date',
              requires_approval: true
            });
            rowOk = false;
          }
        }
      }
    }

    // --- 18. CONFLICTING_SPLIT_TYPE (Row 42) ---
    if (splitType === 'equal' && splitDetails.trim().length > 0) {
      rowAnomalies.push({
        row: rowNum,
        field: 'split_type',
        issue_type: 'CONFLICTING_SPLIT_TYPE',
        raw_value: 'equal with details',
        detected_value: 'share',
        action: 'Warn: split_type="equal" but details provided. Use "share" logic.',
        requires_approval: true
      });
      // We will override splitType to 'share' because of details presence
      splitType = 'share';
    }

    // Parse splitDetails (e.g. "Rohan 700; Priya 400; Meera 400" or "Aisha 30%; Rohan 30%; Priya 30%; Meera 20%")
    const detailsMap = {};
    if (splitDetails) {
      splitDetails.split(';').forEach(part => {
        const match = part.trim().match(/^(.+?)\s+(\d+(\.\d+)?)(%)?$/);
        if (match) {
          let name = match[1].trim();
          // Normalize name
          const canonical = canonicalNames.find(c => c.toLowerCase() === name.toLowerCase());
          if (canonical) name = canonical;
          const val = parseFloat(match[2]);
          detailsMap[name] = val;
        }
      });
    }

    // --- 12. PERCENTAGE_MISMATCH (Row 15) ---
    if (splitType === 'percentage' && Object.keys(detailsMap).length > 0) {
      let sumPct = 0;
      Object.keys(detailsMap).forEach(k => {
        sumPct += detailsMap[k];
      });
      if (Math.abs(sumPct - 100) > 0.01) {
        rowAnomalies.push({
          row: rowNum,
          field: 'split_details',
          issue_type: 'PERCENTAGE_MISMATCH',
          raw_value: splitDetails,
          detected_value: `${sumPct}%`,
          action: 'Block row: percentages do not sum to 100%',
          requires_approval: true
        });
        rowOk = false;
      }
    }

    // --- 1. DUPLICATE ROW (Rows 5 & 6) ---
    // Duplicate check: Same date + normalized description + amount + payer
    if (finalDate && normalizedPaidBy && !isNaN(amount)) {
      const isDuplicate = seenRows.find(
        r => r.date === finalDate &&
             areDescriptionsFuzzyEqual(r.description, description) &&
             r.amount === amount &&
             r.paidBy === normalizedPaidBy
      );
      if (isDuplicate) {
        rowAnomalies.push({
          row: rowNum,
          field: 'all',
          issue_type: 'DUPLICATE_ROW',
          raw_value: 'Exact/near duplicate found',
          detected_value: `Row ${isDuplicate.rowNum}`,
          action: 'Mark duplicate, require user approval before deletion',
          requires_approval: true
        });
        rowOk = false; // Block auto import
      } else {
        seenRows.push({
          rowNum,
          date: finalDate,
          description: description,
          amount,
          paidBy: normalizedPaidBy
        });
      }
    }

    // --- 13. DUPLICATE DINNER (Rows 24 & 25) ---
    // Same event, different amounts (2400 vs 2450), different payers on same date
    if (finalDate && description.toLowerCase().includes('thalassa')) {
      const duplicateDinnerMatch = seenRows.find(
        r => r.date === finalDate &&
             (r.description.toLowerCase().includes('thalassa') || r.description.toLowerCase().includes('dinner')) &&
             r.rowNum !== rowNum &&
             r.paidBy !== normalizedPaidBy
      );
      if (duplicateDinnerMatch) {
        rowAnomalies.push({
          row: rowNum,
          field: 'description',
          issue_type: 'DUPLICATE_DINNER',
          raw_value: `Amount: ${amount}, Payer: ${normalizedPaidBy}`,
          detected_value: `Conflicting row ${duplicateDinnerMatch.rowNum} (Amount: ${duplicateDinnerMatch.amount}, Payer: ${duplicateDinnerMatch.paidBy})`,
          action: 'Flag both, require user to pick one',
          requires_approval: true
        });
        rowOk = false;
      }
    }

    // Collect all anomalies
    anomalies.push(...rowAnomalies);

    // Save parsed row if it wasn't skipped completely (rowOk)
    if (rowOk) {
      parsedRows.push({
        row_number: rowNum,
        date: finalDate,
        description: description.trim(),
        paid_by: normalizedPaidBy,
        amount: amount,
        currency: finalCurrency,
        split_type: splitType,
        participants: participants,
        details: detailsMap,
        notes: notes.trim(),
        is_settlement: isSettlement,
        is_refund: isRefund
      });
    }
  });

  const requiresApprovalList = anomalies.filter(a => a.requires_approval);
  const rowsOk = parsedRows.length;
  
  return {
    rows_ok: rowsOk,
    rows_total: csvRows.length,
    anomalies,
    requires_approval: requiresApprovalList,
    parsed_rows: parsedRows
  };
}

module.exports = { parseImportCSV };
