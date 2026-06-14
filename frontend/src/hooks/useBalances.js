import { useState, useCallback } from 'react';
import client from '../api/client';

export function useBalances(groupId) {
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBalances = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await client.get(`/groups/${groupId}/balance`);
      const data = res.data.balances || res.data || [];
      setBalances(data);
      // Check if settlements are included
      if (res.data.settlements) {
        setSettlements(res.data.settlements);
      }
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load balances');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const fetchBreakdown = useCallback(async (userId) => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await client.get(`/groups/${groupId}/balance/breakdown`, {
        params: userId ? { user_id: userId } : {},
      });
      setBreakdown(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load breakdown');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const fetchSettlements = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await client.get(`/groups/${groupId}/settlements`);
      const data = res.data.settlements || res.data || [];
      setSettlements(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch settlements', err);
    }
  }, [groupId]);

  const createSettlement = useCallback(async (settlementData) => {
    if (!groupId) return;
    const res = await client.post(`/groups/${groupId}/settlements`, settlementData);
    return res.data;
  }, [groupId]);

  return {
    balances,
    settlements,
    breakdown,
    loading,
    error,
    fetchBalances,
    fetchBreakdown,
    fetchSettlements,
    createSettlement,
  };
}
