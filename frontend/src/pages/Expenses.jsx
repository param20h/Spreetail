import { useEffect, useState, useCallback } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import AddExpenseModal from '../components/expenses/AddExpenseModal';
import ExpenseDetailModal from '../components/expenses/ExpenseDetailModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Plus, Search, Calendar, Filter, Receipt, ChevronDown, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

export default function Expenses({ currentGroup }) {
  const { expenses, loading, fetchExpenses, createExpense, updateExpense, deleteExpense } = useExpenses(currentGroup?.id);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [currency, setCurrency] = useState('');
  
  const [search, setSearch] = useState('');

  const loadData = useCallback(() => {
    if (currentGroup?.id) {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (paidBy) params.paid_by = paidBy;
      if (currency) params.currency = currency;
      fetchExpenses(params);
    }
  }, [currentGroup, startDate, endDate, paidBy, currency, fetchExpenses]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recipient names lookup helper
  const getPayerName = (id) => {
    const member = currentGroup?.members?.find(m => m.user_id === id);
    if (member) return member.name;
    if (id === '11111111-1111-1111-1111-111111111111') return 'Aisha';
    if (id === '22222222-2222-2222-2222-222222222222') return 'Rohan';
    if (id === '33333333-3333-3333-3333-333333333333') return 'Priya';
    if (id === '44444444-4444-4444-4444-444444444444') return 'Meera';
    if (id === '55555555-5555-5555-5555-555555555555') return 'Sam';
    if (id === '66666666-6666-6666-6666-666666666666') return 'Dev';
    if (id === '77777777-7777-7777-7777-777777777777') return 'Kabir';
    return 'Unknown';
  };

  const handleSaveExpense = async (payload) => {
    if (selectedExpense) {
      // Edit
      await updateExpense(selectedExpense.id, payload);
    } else {
      // Add
      await createExpense(payload);
    }
    loadData();
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await deleteExpense(id);
      loadData();
    }
  };

  if (!currentGroup) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
        <Receipt className="w-12 h-12 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Group Selected</h2>
        <p className="text-slate-400 max-w-sm">Select a group to view and add expenses.</p>
      </div>
    );
  }

  // Filter local rows by search keyword
  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase()) || 
    (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Expenses
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage and track all group expenses.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedExpense(null);
            setShowAddModal(true);
          }}
          className="shadow-lg shadow-teal-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-navy-850 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/40"
            />
          </div>

          {/* Paid By dropdown */}
          <div className="min-w-[150px]">
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            >
              <option value="">Paid By: All</option>
              {currentGroup?.members?.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Currency dropdown */}
          <div className="min-w-[120px]">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            >
              <option value="">Currency: All</option>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setPaidBy('');
              setCurrency('');
              setSearch('');
            }}
            className="cursor-pointer"
          >
            Clear Filters
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Date Range:
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-navy-850 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            />
            <span className="text-slate-500 text-xs">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-navy-850 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            />
          </div>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card className="overflow-hidden p-0 border border-white/5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No expenses match your search/filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-navy-800/60 text-slate-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Paid By</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Split</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => {
                      setSelectedExpense(expense);
                      setShowDetailModal(true);
                    }}
                    className="hover:bg-navy-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-400">
                      {formatDate(expense.date)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white max-w-[200px] sm:max-w-xs truncate">
                      {expense.description}
                      {expense.is_refund && (
                        <span className="bg-rose-500/15 text-rose-400 text-[8px] font-bold border border-rose-500/25 px-1 rounded ml-1.5 uppercase">Refund</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">
                      {getPayerName(expense.paid_by_user_id)}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold tabular-nums ${expense.is_refund ? 'text-rose-400' : 'text-white'}`}>
                      {expense.is_refund ? '-' : ''}{formatCurrency(Math.abs(Number(expense.amount)), expense.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="teal">{expense.split_type}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setShowAddModal(true);
                          }}
                          className="px-2 py-1 h-auto text-xs cursor-pointer"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="px-2 py-1 h-auto text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <AddExpenseModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedExpense(null);
          }}
          currentGroup={currentGroup}
          onSave={handleSaveExpense}
          expenseToEdit={selectedExpense}
        />
      )}

      {/* Details Modal */}
      {showDetailModal && selectedExpense && (
        <ExpenseDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedExpense(null);
          }}
          expense={selectedExpense}
          currentGroup={currentGroup}
          onEdit={(exp) => {
            setSelectedExpense(exp);
            setShowAddModal(true);
          }}
          onDelete={handleDeleteExpense}
        />
      )}
    </div>
  );
}
