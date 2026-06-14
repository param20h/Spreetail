function getFxRate(dateStr, fxRates = []) {
  if (!fxRates || fxRates.length === 0) return 84.0; // Default rate if none provided
  
  const targetDate = new Date(dateStr);
  
  // Filter for USD -> INR rates effective on or before targetDate
  const validRates = fxRates.filter(r => 
    r.from_currency === 'USD' && 
    r.to_currency === 'INR' && 
    new Date(r.effective_date) <= targetDate
  );
  
  if (validRates.length === 0) {
    // If no rates before the date, pick the earliest rate available
    const allUsdRates = fxRates.filter(r => r.from_currency === 'USD' && r.to_currency === 'INR');
    if (allUsdRates.length === 0) return 84.0;
    allUsdRates.sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date));
    return parseFloat(allUsdRates[0].rate);
  }
  
  // Sort descending by effective_date to get the closest one
  validRates.sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
  return parseFloat(validRates[0].rate);
}

function convertToINR(amount, currency, dateStr, fxRates = []) {
  if (currency === 'INR') return parseFloat(amount);
  if (currency === 'USD') {
    const rate = getFxRate(dateStr, fxRates);
    return parseFloat(amount) * rate;
  }
  return parseFloat(amount); // Default fallback
}

/**
 * Checks if a member is active on a specific date.
 */
function isMemberActiveOnDate(member, dateStr) {
  const dateObj = new Date(dateStr);
  const joinedObj = new Date(member.joined_at);
  const leftObj = member.left_at ? new Date(member.left_at) : null;
  
  if (dateObj < joinedObj) return false;
  if (leftObj && dateObj > leftObj) return false;
  return true;
}

/**
 * Computes net balances, audit trail breakdowns, and simplified debt graph.
 * 
 * @param {Array<Object>} expenses - Array of expenses
 * @param {Array<Object>} splits - Array of expense splits
 * @param {Array<Object>} settlements - Array of settlements
 * @param {Array<Object>} members - Array of group members with user details { user_id, name, joined_at, left_at }
 * @param {Array<Object>} fxRates - Array of FX rates
 * @param {string} [asOfDate] - Optional date to compute balance up to
 */
function calculateBalances(expenses, splits, settlements, members, fxRates = [], asOfDate = null) {
  const asOf = asOfDate ? new Date(asOfDate) : null;
  
  // Filter expenses and settlements by asOfDate if provided
  const filteredExpenses = expenses.filter(e => {
    if (e.is_settlement) return false; // Ignore settlements stored in expenses table, they go through settlements
    if (asOf && new Date(e.date) > asOf) return false;
    return true;
  });
  
  const filteredSettlements = settlements.filter(s => {
    if (asOf && new Date(s.date) > asOf) return false;
    return true;
  });

  // Initialize ledger for all members
  const ledger = {};
  members.forEach(m => {
    ledger[m.user_id] = {
      user_id: m.user_id,
      name: m.name,
      credits: 0, // money paid
      debits: 0,  // money owed
      net: 0,
      breakdown: []
    };
  });

  // Process expenses
  filteredExpenses.forEach(expense => {
    const expenseDate = expense.date;
    const payerId = expense.paid_by_user_id;
    const amountInINR = convertToINR(expense.amount, expense.currency, expenseDate, fxRates);
    
    // Find splits for this expense
    const expenseSplits = splits.filter(s => s.expense_id === expense.id);
    
    // Determine active participants for this expense based on membership dates
    const activeSplits = expenseSplits.filter(split => {
      const member = members.find(m => m.user_id === split.user_id);
      if (!member) return false;
      return isMemberActiveOnDate(member, expenseDate);
    });

    if (activeSplits.length === 0) return;

    // Determine the conversion rate used for audit trail
    const rateUsed = expense.currency === 'USD' ? getFxRate(expenseDate, fxRates) : 1;

    // Credit the payer the full amount in INR (if payer is active)
    const payerMember = members.find(m => m.user_id === payerId);
    const isPayerActive = payerMember ? isMemberActiveOnDate(payerMember, expenseDate) : false;

    if (isPayerActive && ledger[payerId]) {
      ledger[payerId].credits += amountInINR;
      ledger[payerId].breakdown.push({
        expense_id: expense.id,
        date: expenseDate,
        description: expense.description,
        total_amount: parseFloat(expense.amount),
        currency: expense.currency,
        fx_rate_used: rateUsed,
        amount_in_inr: amountInINR,
        their_share_in_inr: 0, // they paid, so we note share separately below if they participated
        role: 'payer',
        notes: expense.notes
      });
    }

    // Debit each active participant their split share in INR
    activeSplits.forEach(split => {
      const participantId = split.user_id;
      if (!ledger[participantId]) return;

      // Split amount is stored in expense currency, convert to INR
      const splitAmountInINR = convertToINR(split.amount, expense.currency, expenseDate, fxRates);
      
      ledger[participantId].debits += splitAmountInINR;
      
      // Find or add to breakdown
      let breakEntry = ledger[participantId].breakdown.find(b => b.expense_id === expense.id);
      if (!breakEntry) {
        breakEntry = {
          expense_id: expense.id,
          date: expenseDate,
          description: expense.description,
          total_amount: parseFloat(expense.amount),
          currency: expense.currency,
          fx_rate_used: rateUsed,
          amount_in_inr: amountInINR,
          their_share_in_inr: splitAmountInINR,
          role: participantId === payerId ? 'payer_and_participant' : 'participant',
          notes: expense.notes
        };
        ledger[participantId].breakdown.push(breakEntry);
      } else {
        breakEntry.their_share_in_inr = splitAmountInINR;
        breakEntry.role = 'payer_and_participant';
      }
    });
  });

  // Process settlements
  filteredSettlements.forEach(settlement => {
    const fromId = settlement.paid_by;
    const toId = settlement.paid_to;
    const settlementDate = settlement.date;
    const amountInINR = convertToINR(settlement.amount, settlement.currency, settlementDate, fxRates);
    const rateUsed = settlement.currency === 'USD' ? getFxRate(settlementDate, fxRates) : 1;

    // Check if both users are active on settlement date
    const fromMember = members.find(m => m.user_id === fromId);
    const toMember = members.find(m => m.user_id === toId);
    
    const isFromActive = fromMember ? isMemberActiveOnDate(fromMember, settlementDate) : false;
    const isToActive = toMember ? isMemberActiveOnDate(toMember, settlementDate) : false;

    if (isFromActive && ledger[fromId]) {
      // Payer of settlement is credited (they paid off their debt)
      ledger[fromId].credits += amountInINR;
      ledger[fromId].breakdown.push({
        settlement_id: settlement.id,
        date: settlementDate,
        description: `Settlement: Paid to ${ledger[toId] ? ledger[toId].name : 'Unknown'}`,
        total_amount: parseFloat(settlement.amount),
        currency: settlement.currency,
        fx_rate_used: rateUsed,
        amount_in_inr: amountInINR,
        their_share_in_inr: 0,
        role: 'settlement_payer',
        notes: settlement.notes
      });
    }

    if (isToActive && ledger[toId]) {
      // Receiver of settlement is debited (they received cash, reducing what is owed to them)
      ledger[toId].debits += amountInINR;
      ledger[toId].breakdown.push({
        settlement_id: settlement.id,
        date: settlementDate,
        description: `Settlement: Received from ${ledger[fromId] ? ledger[fromId].name : 'Unknown'}`,
        total_amount: parseFloat(settlement.amount),
        currency: settlement.currency,
        fx_rate_used: rateUsed,
        amount_in_inr: amountInINR,
        their_share_in_inr: amountInINR,
        role: 'settlement_receiver',
        notes: settlement.notes
      });
    }
  });

  // Calculate final net balance per user
  const perUserNet = {};
  members.forEach(m => {
    const userLedger = ledger[m.user_id];
    userLedger.net = Math.round((userLedger.credits - userLedger.debits) * 100) / 100;
    perUserNet[m.user_id] = userLedger.net;
  });

  // Debt Simplification (Greedy Algorithm)
  const settlementsNeeded = simplifyDebts(perUserNet, members);

  return {
    per_user_net: perUserNet,
    settlements_needed: settlementsNeeded,
    breakdown: ledger,
    as_of: asOfDate || new Date().toISOString().split('T')[0]
  };
}

function simplifyDebts(perUserNet, members) {
  const debtGraph = [];
  
  // Clone net balances
  const balances = {};
  Object.keys(perUserNet).forEach(uid => {
    balances[uid] = perUserNet[uid];
  });

  const getMemberName = (uid) => {
    const m = members.find(mem => mem.user_id === uid);
    return m ? m.name : 'Unknown';
  };

  while (true) {
    // Find max debtor and max creditor
    let maxDebtorId = null;
    let maxDebtorVal = 0;
    let maxCreditorId = null;
    let maxCreditorVal = 0;

    Object.keys(balances).forEach(uid => {
      const bal = balances[uid];
      if (bal < -0.01 && bal < maxDebtorVal) {
        maxDebtorVal = bal;
        maxDebtorId = uid;
      }
      if (bal > 0.01 && bal > maxCreditorVal) {
        maxCreditorVal = bal;
        maxCreditorId = uid;
      }
    });

    // If no significant debts remain, we're done
    if (!maxDebtorId || !maxCreditorId) {
      break;
    }

    // Settle minimal amount
    const settleAmount = Math.min(Math.abs(maxDebtorVal), maxCreditorVal);
    const roundedSettle = Math.round(settleAmount * 100) / 100;

    if (roundedSettle > 0) {
      debtGraph.push({
        paid_by: maxDebtorId,
        paid_by_name: getMemberName(maxDebtorId),
        paid_to: maxCreditorId,
        paid_to_name: getMemberName(maxCreditorId),
        amount: roundedSettle,
        currency: 'INR'
      });
      
      balances[maxDebtorId] = Math.round((balances[maxDebtorId] + roundedSettle) * 100) / 100;
      balances[maxCreditorId] = Math.round((balances[maxCreditorId] - roundedSettle) * 100) / 100;
    } else {
      break;
    }
  }

  return debtGraph;
}

module.exports = {
  calculateBalances,
  simplifyDebts,
  convertToINR,
  getFxRate,
  isMemberActiveOnDate
};
