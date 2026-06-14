import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useGroups() {
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGroups = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await client.get('/groups');
      const data = res.data.groups || res.data || [];
      setGroups(data);
      // Restore last selected group
      const savedGroupId = localStorage.getItem('flatmate_current_group');
      if (savedGroupId) {
        const saved = data.find((g) => String(g.id) === savedGroupId);
        if (saved) {
          setCurrentGroup(saved);
        } else if (data.length > 0) {
          setCurrentGroup(data[0]);
        }
      } else if (data.length > 0) {
        setCurrentGroup(data[0]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchGroupDetail = useCallback(async (groupId) => {
    const res = await client.get(`/groups/${groupId}`);
    return res.data.group || res.data;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGroups();
    } else {
      setGroups([]);
      setCurrentGroup(null);
    }
  }, [fetchGroups, isAuthenticated]);

  useEffect(() => {
    if (currentGroup && !currentGroup.members) {
      const loadDetail = async () => {
        try {
          const detail = await fetchGroupDetail(currentGroup.id);
          setCurrentGroup(detail);
        } catch (err) {
          console.error('Failed to fetch group details in effect', err);
        }
      };
      loadDetail();
    }
  }, [currentGroup, fetchGroupDetail]);

  const selectGroup = useCallback((group) => {
    setCurrentGroup(group);
    localStorage.setItem('flatmate_current_group', String(group.id));
  }, []);

  const createGroup = useCallback(async (name) => {
    const res = await client.post('/groups', { name });
    const newGroup = res.data.group || res.data;
    setGroups((prev) => [...prev, newGroup]);
    setCurrentGroup(newGroup);
    localStorage.setItem('flatmate_current_group', String(newGroup.id));
    return newGroup;
  }, []);

  return {
    groups,
    currentGroup,
    loading,
    error,
    selectGroup,
    createGroup,
    fetchGroups,
    fetchGroupDetail,
  };
}
