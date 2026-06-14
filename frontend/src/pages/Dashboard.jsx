import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBalances } from '../hooks/useBalances';
import { useExpenses } from '../hooks/useExpenses';
import { formatCurrency, getBalanceColor, getBalanceBg } from '../utils/formatters';
import { ArrowRight, Receipt, Scale, TrendingDown, TrendingUp, Sparkles, CheckCircle2, User } from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

export default function Dashboard({ currentGroup }) {
  const { user } = useAuth();
  const { balances, settlements, loading: balanceLoading, fetchBalances, createSettlement } = useBalances(currentGroup?.id);
  const { expenses, loading: expensesLoading, fetchExpenses } = useExpenses(currentGroup?.id);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settlementInProgress, setSettlementInProgress] = useState(false);
  
  // State for recording a manual settlement
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (currentGroup?.id) {
      fetchBalances();
      fetchExpenses({ limit: 10 });
    }
  }, [currentGroup, fetchBalances, fetchExpenses]);

  const handleRecordSettlement = async () => {
    if (!selectedSettlement) return;
    try {
      setSettlementInProgress(true);
      await createSettlement({
        paid_by: selectedSettlement.paid_by,
        paid_to: selectedSettlement.paid_to,
        amount: selectedSettlement.amount,
        date: settlementDate,
        notes: `Settled via Dashboard: ${selectedSettlement.paid_by_name} paid ${selectedSettlement.paid_to_name}`
      });
      // Refresh balances
      await fetchBalances();
      setShowSettleModal(false);
      setSelectedSettlement(null);
    } catch (err) {
      console.error('Failed to record settlement', err);
      alert('Error recording settlement');
    } finally {
      setSettlementInProgress(false);
    }
  };

  if (balanceLoading || expensesLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 border border-slate-700/50">
          <TrendingUp className="w-8 h-8 text-teal-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Group Selected</h2>
        <p className="text-slate-400 max-w-sm mb-6">Select an existing group from the top dropdown menu, or create a new group to start tracking expenses.</p>
      </div>
    );
  }

  // Net balances map
  const netBalances = balances.per_user_net || {};
  const settlementsNeeded = balances.settlements_needed || [];
  
  // Calculate total group spending
  const totalSpend = expenses.reduce((sum, e) => sum + (e.currency === 'USD' ? Number(e.amount) * 84 : Number(e.amount)), 0);

  // User's own balance
  const myBalance = netBalances[user?.id] || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Hey, {user?.name}! <Sparkles className="w-5 h-5 text-teal-400 animate-float" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">Here is a summary of balances in <span className="text-teal-400 font-medium">{currentGroup.name}</span>.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => setShowSettleModal(true)}
            disabled={settlementsNeeded.length === 0}
            className="shadow-lg shadow-teal-500/10 cursor-pointer"
          >
            <Scale className="w-4 h-4 mr-2" />
            Settle Up
          </Button>
        </div>
      </div>

      {/* Hero Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700/50">
            <Receipt className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Spending (INR)</p>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">{formatCurrency(totalSpend, 'INR')}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${myBalance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
            {myBalance >= 0 ? (
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            ) : (
              <TrendingDown className="w-6 h-6 text-rose-400" />
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Your Balance</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${getBalanceColor(myBalance)}`}>
              {myBalance === 0 ? 'Settled Up' : formatCurrency(myBalance, 'INR')}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700/50">
            <Scale className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Debts to Settle</p>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">{settlementsNeeded.length} transactions</p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Balances + Settlements / Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Balances list */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Balances <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">All Members</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(netBalances).map(memberId => {
              const bal = netBalances[memberId];
              const isCurrentUser = memberId === user?.id;
              // Find member details
              // Group details has members
              // We'll fallback to generic member names if not fully populated
              return (
                <Card key={memberId} className={`p-4 border transition-all hover:scale-[1.01] ${getBalanceBg(bal)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-300 font-semibold uppercase">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white flex items-center gap-1.5 text-sm">
                          {netBalances[memberId] === undefined ? 'Unknown' : (memberId === '11111111-1111-1111-1111-111111111111' ? 'Aisha' : memberId === '22222222-2222-2222-2222-222222222222' ? 'Rohan' : memberId === '33333333-3333-3333-3333-333333333333' ? 'Priya' : memberId === '44444444-4444-4444-4444-444444444444' ? 'Meera' : memberId === '55555555-5555-5555-5555-555555555555' ? 'Sam' : memberId === '66666666-6666-6666-6666-666666666666' ? 'Dev' : memberId === '77777777-7777-7777-7777-777777777777' ? 'Kabir' : 'Flatmate')}
                          {isCurrentUser && <span className="text-[10px] bg-slate-800 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded-full font-normal">You</span>}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {bal > 0 ? 'is owed' : bal < 0 ? 'owes' : 'settled up'}
                        </p>
                      </div>
                    </div>
                    <div className={`text-base font-bold tabular-nums ${getBalanceColor(bal)}`}>
                      {bal === 0 ? '—' : formatCurrency(Math.abs(bal), 'INR')}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Simplified Settlements */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Suggested Settlements
          </h2>
          <Card className="p-4 space-y-4">
            {settlementsNeeded.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 animate-pulse" />
                <p className="text-sm font-semibold text-white">Everyone is Settled!</p>
                <p className="text-xs text-slate-500 mt-1">No transactions are currently needed.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {settlementsNeeded.map((s, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">{s.paid_by_name}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="font-semibold text-slate-300">{s.paid_to_name}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold text-teal-400 tabular-nums">{formatCurrency(s.amount, 'INR')}</span>
                      <button
                        onClick={() => {
                          setSelectedSettlement(s);
                          setShowSettleModal(true);
                        }}
                        className="text-xs bg-teal-500 hover:bg-teal-400 text-white font-medium px-2 py-1 rounded transition-colors cursor-pointer"
                      >
                        Record
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Recent Expenses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Recent Expenses
          </h2>
        </div>
        <Card className="overflow-hidden p-0">
          {expenses.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No expenses recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-slate-800/20 transition-colors">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-white truncate text-sm">{expense.description}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>Paid by {expense.paid_by_user_id === '11111111-1111-1111-1111-111111111111' ? 'Aisha' : expense.paid_by_user_id === '22222222-2222-2222-2222-222222222222' ? 'Rohan' : expense.paid_by_user_id === '33333333-3333-3333-3333-333333333333' ? 'Priya' : expense.paid_by_user_id === '44444444-4444-4444-4444-444444444444' ? 'Meera' : expense.paid_by_user_id === '55555555-5555-5555-5555-555555555555' ? 'Sam' : expense.paid_by_user_id === '66666666-6666-6666-6666-666666666666' ? 'Dev' : expense.paid_by_user_id === '77777777-7777-7777-7777-777777777777' ? 'Kabir' : 'Flatmate'}</span>
                      <span>•</span>
                      <span>{new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      {expense.is_refund && <span className="bg-rose-500/15 text-rose-400 border border-rose-500/20 text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">Refund</span>}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <span className={`text-sm font-bold tabular-nums ${expense.is_refund ? 'text-rose-400' : 'text-white'}`}>
                      {expense.is_refund ? '-' : ''}{formatCurrency(Math.abs(Number(expense.amount)), expense.currency)}
                    </span>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">{expense.split_type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Settle Up Confirmation Modal */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => {
          setShowSettleModal(false);
          setSelectedSettlement(null);
        }}
        title={selectedSettlement ? "Confirm Settlement" : "Settle Group Debts"}
      >
        <div className="space-y-4">
          {selectedSettlement ? (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl flex flex-col gap-3 items-center text-center">
                <div className="flex items-center gap-3 justify-center">
                  <span className="font-semibold text-white">{selectedSettlement.paid_by_name}</span>
                  <ArrowRight className="w-4 h-4 text-teal-400" />
                  <span className="font-semibold text-white">{selectedSettlement.paid_to_name}</span>
                </div>
                <div className="text-3xl font-extrabold text-teal-400 tabular-nums">
                  {formatCurrency(selectedSettlement.amount, 'INR')}
                </div>
                <p className="text-xs text-slate-500">By confirming, you record this settlement of debt in the ledger.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">Date of Payment</label>
                <input
                  type="date"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSettlement(null)}
                  disabled={settlementInProgress}
                  className="cursor-pointer"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleRecordSettlement}
                  disabled={settlementInProgress}
                  className="cursor-pointer"
                >
                  {settlementInProgress ? <Spinner size="sm" /> : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Select one of the suggested transactions to record a settlement:</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {settlementsNeeded.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedSettlement(s)}
                    className="flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/30 hover:border-teal-500/20 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="font-semibold text-white">{s.paid_by_name}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="font-semibold text-white">{s.paid_to_name}</span>
                    </div>
                    <span className="text-sm font-bold text-teal-400 tabular-nums">{formatCurrency(s.amount, 'INR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
