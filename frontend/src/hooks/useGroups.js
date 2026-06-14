import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export function useGroups() {
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGroups = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

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

  const fetchGroupDetail = useCallback(async (groupId) => {
    const res = await client.get(`/groups/${groupId}`);
    return res.data.group || res.data;
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
