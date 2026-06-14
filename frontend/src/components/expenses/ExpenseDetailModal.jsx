import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Calendar, User, Info, DollarSign, Edit, Trash2 } from 'lucide-react';

export default function ExpenseDetailModal({ isOpen, onClose, expense, onEdit, onDelete }) {
  if (!expense) return null;

  // Recipient names lookup helper
  const getPayerName = (id) => {
    if (id === '11111111-1111-1111-1111-111111111111') return 'Aisha';
    if (id === '22222222-2222-2222-2222-222222222222') return 'Rohan';
    if (id === '33333333-3333-3333-3333-333333333333') return 'Priya';
    if (id === '44444444-4444-4444-4444-444444444444') return 'Meera';
    if (id === '55555555-5555-5555-5555-555555555555') return 'Sam';
    if (id === '66666666-6666-6666-6666-666666666666') return 'Dev';
    if (id === '77777777-7777-7777-7777-777777777777') return 'Kabir';
    return 'Unknown User';
  };

  const isUSD = expense.currency === 'USD';
  const displayAmount = Number(expense.amount);
  const inrValue = isUSD ? displayAmount * 84 : displayAmount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Expense Details"
      size="md"
    >
      <div className="space-y-5">
        {/* Header summary */}
        <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Total Expense</span>
          <div className={`text-3xl font-extrabold tabular-nums ${expense.is_refund ? 'text-rose-400' : 'text-white'}`}>
            {expense.is_refund ? '-' : ''}{formatCurrency(Math.abs(displayAmount), expense.currency)}
          </div>
          {isUSD && (
            <div className="text-xs text-slate-400 mt-1">
              ≈ {formatCurrency(Math.abs(inrValue), 'INR')} (at ₹84.00/USD)
            </div>
          )}
          <div className="mt-3 flex gap-2 flex-wrap justify-center">
            <Badge variant="teal">{expense.split_type}</Badge>
            {expense.is_refund && <Badge variant="danger">Refund</Badge>}
            {expense.import_row_ref && <Badge variant="slate">CSV Row {expense.import_row_ref}</Badge>}
          </div>
        </div>

        {/* Info list */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-3 bg-slate-800/20 border border-slate-700/20 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-teal-400" />
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Date</p>
              <p className="text-xs font-semibold text-white mt-0.5">{formatDate(expense.date)}</p>
            </div>
          </Card>

          <Card className="p-3 bg-slate-800/20 border border-slate-700/20 flex items-center gap-3">
            <User className="w-4 h-4 text-teal-400" />
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Paid By</p>
              <p className="text-xs font-semibold text-white mt-0.5">{getPayerName(expense.paid_by_user_id)}</p>
            </div>
          </Card>
        </div>

        {/* Splits Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itemized Breakdown</h3>
          <Card className="overflow-hidden p-0 border border-slate-700/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-700/50">
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3 text-right">Share Detail</th>
                  <th className="py-2.5 px-3 text-right">Owes ({expense.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {expense.splits?.map((split) => {
                  const detailsText = expense.split_type === 'percentage' 
                    ? `${split.percentage}%` 
                    : expense.split_type === 'share' 
                    ? `${split.shares} shares` 
                    : 'Equal';
                    
                  return (
                    <tr key={split.id} className="hover:bg-slate-800/10">
                      <td className="py-2.5 px-3 font-medium text-white">
                        {getPayerName(split.user_id)}
                        {split.user_id === expense.paid_by_user_id && (
                          <span className="text-[9px] bg-teal-500/10 text-teal-400 border border-teal-500/25 px-1 rounded ml-1.5 font-normal uppercase">Payer</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-mono">{detailsText}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                        {formatCurrency(split.amount, expense.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        {expense.notes && (
          <div className="bg-slate-800/10 border border-slate-700/30 p-3 rounded-2xl text-xs text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-300">Notes</p>
              <p className="mt-0.5">{expense.notes}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-end pt-3 border-t border-slate-800/80">
          <Button
            variant="danger"
            onClick={() => {
              onDelete(expense.id);
              onClose();
            }}
            className="mr-auto cursor-pointer"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="cursor-pointer"
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onEdit(expense);
              onClose();
            }}
            className="cursor-pointer"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
