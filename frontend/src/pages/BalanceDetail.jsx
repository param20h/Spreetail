import { useEffect, useState } from 'react';
import { useBalances } from '../hooks/useBalances';
import { formatCurrency, formatDate, getBalanceColor, getBalanceBg } from '../utils/formatters';
import { Scale, Receipt, ArrowRight, User } from 'lucide-react';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';

export default function BalanceDetail({ currentGroup }) {
  const { breakdown, loading, fetchBreakdown } = useBalances(currentGroup?.id);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (currentGroup?.id) {
      fetchBreakdown().then((data) => {
        // Default to first user if available
        if (data && Object.keys(data).length > 0) {
          setSelectedUserId(Object.keys(data)[0]);
        }
      });
    }
  }, [currentGroup, fetchBreakdown]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
        <Scale className="w-12 h-12 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Group Selected</h2>
        <p className="text-slate-400 max-w-sm">Select a group to view balance breakdowns.</p>
      </div>
    );
  }

  if (!breakdown || Object.keys(breakdown).length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <Receipt className="w-12 h-12 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Balance Data</h2>
        <p className="text-slate-400 max-w-sm">Record some expenses in this group to view breakdowns.</p>
      </div>
    );
  }

  // Selected user's ledger
  const userLedger = breakdown[selectedUserId];
  const userItems = userLedger?.breakdown || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Balance Breakdown</h1>
          <p className="text-sm text-slate-400 mt-1">Audit individual balances and trace splits.</p>
        </div>

        {/* User Selector */}
        <div className="min-w-[200px]">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/40"
          >
            {Object.keys(breakdown).map(uid => (
              <option key={uid} value={uid}>{breakdown[uid].name}</option>
            ))}
          </select>
        </div>
      </div>

      {userLedger && (
        <>
          {/* User Net Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={`p-5 border ${getBalanceBg(userLedger.net)}`}>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Net Balance</p>
              <p className={`text-3xl font-extrabold mt-1 tabular-nums ${getBalanceColor(userLedger.net)}`}>
                {userLedger.net > 0 ? '+' : ''}{formatCurrency(userLedger.net, 'INR')}
              </p>
            </Card>

            <Card className="p-5 border border-white/5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Paid / Contributed</p>
              <p className="text-3xl font-extrabold mt-1 text-white tabular-nums">
                {formatCurrency(userLedger.credits, 'INR')}
              </p>
            </Card>

            <Card className="p-5 border border-white/5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Your Share (Owed)</p>
              <p className="text-3xl font-extrabold mt-1 text-white tabular-nums">
                {formatCurrency(userLedger.debits, 'INR')}
              </p>
            </Card>
          </div>

          {/* Audit trail list */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Itemized Audit Trail <span className="text-xs bg-navy-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">{userItems.length} items</span>
            </h2>
            <Card className="overflow-hidden p-0 border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-navy-800/60 text-slate-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center">Your Role</th>
                      <th className="py-3 px-4 text-right">Expense Amount</th>
                      <th className="py-3 px-4 text-right">Your Share</th>
                      <th className="py-3 px-4 text-right">Impact (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {userItems.map((item, idx) => {
                      // Calculate the numeric impact of this item in the user's ledger:
                      // impact = credits - debits
                      // If role = payer: credits = amount_in_inr, debits = 0 (or their_share_in_inr if they participated)
                      // Let's calculate:
                      let credit = 0;
                      let debit = 0;
                      let roleLabel = 'Participant';

                      if (item.role === 'payer') {
                        credit = item.amount_in_inr;
                        roleLabel = 'Payer';
                      } else if (item.role === 'participant') {
                        debit = item.their_share_in_inr;
                        roleLabel = 'Participant';
                      } else if (item.role === 'payer_and_participant') {
                        credit = item.amount_in_inr;
                        debit = item.their_share_in_inr;
                        roleLabel = 'Payer & Split';
                      } else if (item.role === 'settlement_payer') {
                        credit = item.amount_in_inr;
                        roleLabel = 'Sent Payment';
                      } else if (item.role === 'settlement_receiver') {
                        debit = item.amount_in_inr;
                        roleLabel = 'Recv Payment';
                      }

                      const itemNet = credit - debit;

                      return (
                        <tr key={idx} className="hover:bg-navy-800/40">
                          <td className="py-3 px-4 font-medium text-slate-400">
                            {formatDate(item.date)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white max-w-[200px] truncate">
                            {item.description}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              roleLabel.includes('Payer') 
                                ? 'bg-teal-500/15 text-teal-400 border-teal-500/25' 
                                : roleLabel.includes('Sent') 
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                : roleLabel.includes('Recv')
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                                : 'bg-navy-800/40 text-slate-400 border-white/5'
                            }`}>
                              {roleLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                            {formatCurrency(item.total_amount, item.currency)}
                            {item.currency === 'USD' && item.fx_rate_used && (
                              <span className="text-[10px] block text-slate-500">at ₹{item.fx_rate_used}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                            {item.their_share_in_inr > 0 ? formatCurrency(item.their_share_in_inr, 'INR') : '—'}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold font-mono tabular-nums ${getBalanceColor(itemNet)}`}>
                            {itemNet > 0 ? '+' : ''}{formatCurrency(itemNet, 'INR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-navy-800/30 font-bold border-t border-white/5">
                      <td className="py-3.5 px-4 text-white" colSpan="3">Calculation Totals</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-400">+{formatCurrency(userLedger.credits, 'INR')}</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-rose-450">-{formatCurrency(userLedger.debits, 'INR')}</td>
                      <td className={`py-3.5 px-4 text-right font-mono tabular-nums border-l border-white/5 ${getBalanceColor(userLedger.net)}`}>
                        {userLedger.net > 0 ? '+' : ''}{formatCurrency(userLedger.net, 'INR')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            <Card className="p-4 bg-navy-800/25 border border-white/5 text-xs text-slate-400">
              <p className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                Audit Reconciliation Formula:
              </p>
              <div className="font-mono bg-black/30 p-2.5 rounded-lg border border-black/40 text-teal-400 mt-1.5 overflow-x-auto">
                Net Balance ({userLedger.net}) = Total Paid ({userLedger.credits}) − Total Share ({userLedger.debits})
              </div>
              <p className="mt-2 text-slate-500">
                Each split rate USD is converted to INR using the exchange rate effective on the transaction date, ensuring full audit traceability.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
