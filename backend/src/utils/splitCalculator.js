function calculateSplits(totalAmount, splitType, participants, details = {}) {
  // totalAmount: number, splitType: string, participants: array of user_ids, details: object mapping user_id to value (amount, percentage, shares)
  if (!participants || participants.length === 0) {
    throw new Error('No participants provided for split');
  }

  const splits = [];
  let sumCalculated = 0;

  if (splitType === 'equal') {
    const share = Math.round((totalAmount / participants.length) * 100) / 100;
    participants.forEach((userId, index) => {
      splits.push({
        user_id: userId,
        amount: share,
        percentage: null,
        shares: null
      });
      sumCalculated += share;
    });
    
    // Adjust for rounding issues
    const diff = Math.round((totalAmount - sumCalculated) * 100) / 100;
    if (diff !== 0 && splits.length > 0) {
      splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
    }
  } 
  else if (splitType === 'unequal') {
    participants.forEach((userId) => {
      const val = parseFloat(details[userId]) || 0;
      const amount = Math.round(val * 100) / 100;
      splits.push({
        user_id: userId,
        amount: amount,
        percentage: null,
        shares: null
      });
      sumCalculated += amount;
    });
  } 
  else if (splitType === 'percentage') {
    let totalPct = 0;
    participants.forEach((userId) => {
      const pct = parseFloat(details[userId]) || 0;
      totalPct += pct;
      const amount = Math.round((totalAmount * (pct / 100)) * 100) / 100;
      splits.push({
        user_id: userId,
        amount: amount,
        percentage: pct,
        shares: null
      });
      sumCalculated += amount;
    });
    
    // Adjust for rounding issues ONLY if percentages sum to exactly 100
    if (Math.abs(totalPct - 100) < 0.01) {
      const diff = Math.round((totalAmount - sumCalculated) * 100) / 100;
      if (diff !== 0 && splits.length > 0) {
        splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
      }
    }
  } 
  else if (splitType === 'share') {
    let totalShares = 0;
    participants.forEach((userId) => {
      const shareVal = parseInt(details[userId], 10) || 0;
      totalShares += shareVal;
    });

    if (totalShares === 0) {
      throw new Error('Total shares cannot be zero');
    }

    participants.forEach((userId) => {
      const shareVal = parseInt(details[userId], 10) || 0;
      const amount = Math.round((totalAmount * (shareVal / totalShares)) * 100) / 100;
      splits.push({
        user_id: userId,
        amount: amount,
        percentage: null,
        shares: shareVal
      });
      sumCalculated += amount;
    });

    // Adjust for rounding issues
    const diff = Math.round((totalAmount - sumCalculated) * 100) / 100;
    if (diff !== 0 && splits.length > 0) {
      splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
    }
  } 
  else {
    throw new Error(`Invalid split type: ${splitType}`);
  }

  return splits;
}

module.exports = { calculateSplits };
