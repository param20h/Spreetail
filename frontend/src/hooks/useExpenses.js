import { useState, useCallback } from 'react';
import client from '../api/client';

export function useExpenses(groupId) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async (params = {}) => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await client.get(`/groups/${groupId}/expenses`, { params });
      const data = res.data.expenses || res.data || [];
      setExpenses(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const createExpense = useCallback(async (expenseData) => {
    if (!groupId) return;
    const res = await client.post(`/groups/${groupId}/expenses`, expenseData);
    const newExpense = res.data.expense || res.data;
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  }, [groupId]);

  const updateExpense = useCallback(async (expenseId, expenseData) => {
    const res = await client.put(`/expenses/${expenseId}`, expenseData);
    const updated = res.data.expense || res.data;
    setExpenses((prev) => prev.map((e) => (e.id === expenseId ? updated : e)));
    return updated;
  }, []);

  const deleteExpense = useCallback(async (expenseId) => {
    await client.delete(`/expenses/${expenseId}`);
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  }, []);

  return {
    expenses,
    loading,
    error,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
