import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { formatCurrency } from '../../utils/formatters';

export default function AddExpenseModal({ isOpen, onClose, currentGroup, onSave, expenseToEdit = null }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState('equal');
  const [notes, setNotes] = useState('');

  // Active members for selected date
  const [activeMembers, setActiveMembers] = useState([]);
  // Splits values: key is user_id, value is { amount, percentage, shares }
  const [splitValues, setSplitValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Group members from currentGroup
  const allMembers = currentGroup?.members || [];

  // 1. Filter active members whenever date or group changes
  useEffect(() => {
    if (!date || allMembers.length === 0) return;
    const expenseDate = new Date(date);
    
    const active = allMembers.filter(m => {
      const joined = new Date(m.joined_at);
      const left = m.left_at ? new Date(m.left_at) : null;
      if (expenseDate < joined) return false;
      if (left && expenseDate > left) return false;
      return true;
    });

    setActiveMembers(active);

    // Default paidBy to current user if active, otherwise first active
    if (active.length > 0) {
      const savedPaidBy = expenseToEdit ? expenseToEdit.paid_by_user_id : active[0].user_id;
      // Ensure savedPaidBy is active, else use first active
      const isActive = active.some(a => a.user_id === savedPaidBy);
      setPaidBy(isActive ? savedPaidBy : active[0].user_id);
    }
  }, [date, allMembers, expenseToEdit]);

  // 2. Initialize edit values if editing
  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setAmount(String(expenseToEdit.amount));
      setCurrency(expenseToEdit.currency);
      setDate(new Date(expenseToEdit.date).toISOString().split('T')[0]);
      setSplitType(expenseToEdit.split_type);
      setNotes(expenseToEdit.notes || '');

      // Load splits
      const savedSplits = {};
      expenseToEdit.splits?.forEach(s => {
        savedSplits[s.user_id] = {
          amount: String(s.amount),
          percentage: s.percentage !== null ? String(s.percentage) : '',
          shares: s.shares !== null ? String(s.shares) : ''
        };
      });
      setSplitValues(savedSplits);
    } else {
      // Reset form
      setDescription('');
      setAmount('');
      setCurrency('INR');
      setDate(new Date().toISOString().split('T')[0]);
      setSplitType('equal');
      setNotes('');
      setSplitValues({});
    }
  }, [expenseToEdit, isOpen]);

  // 3. Initialize default values in splitValues when active members change or splitType changes
  useEffect(() => {
    if (activeMembers.length === 0) return;

    const newValues = { ...splitValues };
    const numAmt = parseFloat(amount) || 0;

    activeMembers.forEach(m => {
      if (!newValues[m.user_id]) {
        newValues[m.user_id] = { amount: '', percentage: '', shares: '1' };
      }
    });

    // Auto-calculate splits based on type
    if (splitType === 'equal') {
      const share = numAmt > 0 ? (numAmt / activeMembers.length).toFixed(2) : '';
      activeMembers.forEach(m => {
        newValues[m.user_id] = {
          amount: share,
          percentage: (100 / activeMembers.length).toFixed(1),
          shares: '1'
        };
      });
    } else if (splitType === 'percentage' && !expenseToEdit) {
      const defaultPct = (100 / activeMembers.length).toFixed(1);
      activeMembers.forEach(m => {
        newValues[m.user_id].percentage = defaultPct;
        newValues[m.user_id].amount = numAmt > 0 ? (numAmt * (parseFloat(defaultPct) / 100)).toFixed(2) : '';
      });
    } else if (splitType === 'share' && !expenseToEdit) {
      activeMembers.forEach(m => {
        newValues[m.user_id].shares = '1';
        newValues[m.user_id].amount = numAmt > 0 ? (numAmt / activeMembers.length).toFixed(2) : '';
      });
    }

    setSplitValues(newValues);
  }, [activeMembers, splitType, amount, expenseToEdit]);

  const handleSplitValueChange = (userId, field, val) => {
    const updated = {
      ...splitValues,
      [userId]: {
        ...splitValues[userId],
        [field]: val
      }
    };

    const numAmt = parseFloat(amount) || 0;

    // Live update calculations
    if (splitType === 'percentage' && field === 'percentage') {
      const pct = parseFloat(val) || 0;
      updated[userId].amount = numAmt > 0 ? (numAmt * (pct / 100)).toFixed(2) : '';
    } else if (splitType === 'share' && field === 'shares') {
      // Calculate total shares
      let totalShares = 0;
      activeMembers.forEach(m => {
        const shareVal = m.user_id === userId ? parseInt(val, 10) || 0 : parseInt(updated[m.user_id]?.shares, 10) || 0;
        totalShares += shareVal;
      });

      if (totalShares > 0) {
        activeMembers.forEach(m => {
          const mShare = m.user_id === userId ? parseInt(val, 10) || 0 : parseInt(updated[m.user_id]?.shares, 10) || 0;
          updated[m.user_id].amount = numAmt > 0 ? (numAmt * (mShare / totalShares)).toFixed(2) : '';
        });
      }
    }

    setSplitValues(updated);
  };

  // Calculate sum of splits for UI display
  const getSumSplits = () => {
    return activeMembers.reduce((sum, m) => sum + (parseFloat(splitValues[m.user_id]?.amount) || 0), 0);
  };

  const getSumPercentages = () => {
    return activeMembers.reduce((sum, m) => sum + (parseFloat(splitValues[m.user_id]?.percentage) || 0), 0);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Amount must be a valid positive number');
      return;
    }

    if (!description.trim()) {
      setValidationError('Description is required');
      return;
    }

    if (activeMembers.length === 0) {
      setValidationError('No active group members on the selected date');
      return;
    }

    // 4. Validate split inputs
    let splitsData = [];

    if (splitType === 'equal') {
      const share = numAmount / activeMembers.length;
      splitsData = activeMembers.map(m => ({
        user_id: m.user_id,
        amount: share
      }));
    } else if (splitType === 'unequal') {
      const sum = getSumSplits();
      if (Math.abs(sum - numAmount) > 0.05) {
        setValidationError(`Sum of split amounts (${formatCurrency(sum, currency)}) does not match total amount (${formatCurrency(numAmount, currency)})`);
        return;
      }
      splitsData = activeMembers.map(m => ({
        user_id: m.user_id,
        amount: parseFloat(splitValues[m.user_id]?.amount) || 0
      }));
    } else if (splitType === 'percentage') {
      const sumPct = getSumPercentages();
      if (Math.abs(sumPct - 100) > 0.01) {
        setValidationError(`Percentages must sum to exactly 100% (currently ${sumPct}%)`);
        return;
      }
      splitsData = activeMembers.map(m => ({
        user_id: m.user_id,
        amount: numAmount * ((parseFloat(splitValues[m.user_id]?.percentage) || 0) / 100),
        percentage: parseFloat(splitValues[m.user_id]?.percentage) || 0
      }));
    } else if (splitType === 'share') {
      let totalShares = activeMembers.reduce((sum, m) => sum + (parseInt(splitValues[m.user_id]?.shares, 10) || 0), 0);
      if (totalShares === 0) {
        setValidationError('Total shares must be greater than zero');
        return;
      }
      splitsData = activeMembers.map(m => {
        const sh = parseInt(splitValues[m.user_id]?.shares, 10) || 0;
        return {
          user_id: m.user_id,
          amount: numAmount * (sh / totalShares),
          shares: sh
        };
      });
    }

    try {
      setSaving(true);
      const payload = {
        description: description.trim(),
        amount: numAmount,
        currency,
        paid_by: paidBy,
        date,
        split_type: splitType,
        splits: splitsData,
        notes: notes.trim()
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setValidationError(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? 'Edit Expense' : 'Add Expense'}
      size="md"
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {validationError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-medium">
            {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Groceries BigBasket"
            required
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Amount (${currency})`}
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { value: 'INR', label: 'INR (₹)' },
              { value: 'USD', label: 'USD ($)' }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Paid By"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            options={activeMembers.map(m => ({
              value: m.user_id,
              label: m.name
            }))}
            disabled={activeMembers.length === 0}
          />
          <Select
            label="Split Type"
            value={splitType}
            onChange={(e) => setSplitType(e.target.value)}
            options={[
              { value: 'equal', label: 'Equally' },
              { value: 'unequal', label: 'Unequally (Exact)' },
              { value: 'percentage', label: 'By Percentage' },
              { value: 'share', label: 'By Shares' }
            ]}
          />
        </div>

        {/* Dynamic Split Section */}
        {activeMembers.length > 0 && (
          <div className="border border-slate-700/50 bg-slate-800/20 p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Split Breakdown</h3>
            
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
              {activeMembers.map(m => {
                const userVal = splitValues[m.user_id] || { amount: '', percentage: '', shares: '1' };
                return (
                  <div key={m.user_id} className="flex items-center justify-between gap-4 py-1 border-b border-slate-800/40 last:border-b-0">
                    <span className="text-sm font-medium text-white flex-1">{m.name}</span>
                    
                    {splitType === 'equal' && (
                      <span className="text-xs text-slate-400 font-mono">
                        {formatCurrency(parseFloat(userVal.amount) || 0, currency)}
                      </span>
                    )}

                    {splitType === 'unequal' && (
                      <div className="w-32">
                        <Input
                          type="number"
                          step="0.01"
                          value={userVal.amount}
                          onChange={(e) => handleSplitValueChange(m.user_id, 'amount', e.target.value)}
                          placeholder="Amount"
                          className="h-8 py-0.5 text-xs text-right text-white"
                        />
                      </div>
                    )}

                    {splitType === 'percentage' && (
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <Input
                            type="number"
                            step="0.1"
                            value={userVal.percentage}
                            onChange={(e) => handleSplitValueChange(m.user_id, 'percentage', e.target.value)}
                            placeholder="%"
                            className="h-8 py-0.5 text-xs text-right text-white"
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-mono w-16 text-right">
                          {formatCurrency(parseFloat(userVal.amount) || 0, currency)}
                        </span>
                      </div>
                    )}

                    {splitType === 'share' && (
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <Input
                            type="number"
                            step="1"
                            value={userVal.shares}
                            onChange={(e) => handleSplitValueChange(m.user_id, 'shares', e.target.value)}
                            placeholder="Shares"
                            className="h-8 py-0.5 text-xs text-right text-white"
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-mono w-16 text-right">
                          {formatCurrency(parseFloat(userVal.amount) || 0, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Verification summary line */}
            {splitType !== 'equal' && (
              <div className="flex items-center justify-between border-t border-slate-700/60 pt-2 text-xs font-semibold">
                <span className="text-slate-400">Total Calculated:</span>
                <span className={Math.abs(getSumSplits() - (parseFloat(amount) || 0)) <= 0.05 ? 'text-emerald-400' : 'text-amber-400'}>
                  {formatCurrency(getSumSplits(), currency)} / {formatCurrency(parseFloat(amount) || 0, currency)}
                  {splitType === 'percentage' && ` (${getSumPercentages()}%)`}
                </span>
              </div>
            )}
          </div>
        )}

        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes or context..."
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            type="button"
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={saving || activeMembers.length === 0}
            className="cursor-pointer"
          >
            {saving ? <Spinner size="sm" /> : expenseToEdit ? 'Save Changes' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
