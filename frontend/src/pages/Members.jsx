import { useState, useEffect } from 'react';
import { formatDate } from '../utils/formatters';
import { Users, Plus, Calendar, Mail, UserMinus, UserPlus, Sparkles } from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';

export default function Members({ currentGroup, onRefreshGroup }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [joinedAt, setJoinedAt] = useState(new Date().toISOString().split('T')[0]);
  const [leftAt, setLeftAt] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadMembers = async () => {
    if (!currentGroup?.id) return;
    try {
      setLoading(true);
      const res = await client.get(`/groups/${currentGroup.id}`);
      setMembers(res.data.members || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentGroup]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await client.post(`/groups/${currentGroup.id}/members/email`, {
        name,
        email,
        joined_at: joinedAt
      });
      setName('');
      setEmail('');
      setJoinedAt(new Date().toISOString().split('T')[0]);
      setShowAddModal(false);
      await loadMembers();
      if (onRefreshGroup) onRefreshGroup(); // Update parent sidebar/navbar group list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsLeft = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await client.put(`/groups/${currentGroup.id}/members/${selectedUser.user_id}`, {
        left_at: leftAt
      });
      setShowLeaveModal(false);
      setSelectedUser(null);
      await loadMembers();
      if (onRefreshGroup) onRefreshGroup();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update leave date');
    } finally {
      setSaving(false);
    }
  };

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
        <Users className="w-12 h-12 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Group Selected</h2>
        <p className="text-slate-400 max-w-sm">Select a group to manage members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Members
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage time-scoped memberships for {currentGroup.name}.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAddModal(true)}
          className="shadow-lg shadow-teal-500/10 cursor-pointer"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Members List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((m) => {
          const isLeft = m.left_at !== null;
          const isActive = !isLeft;
          
          return (
            <Card key={m.user_id} className={`p-5 flex flex-col justify-between transition-all hover:scale-[1.01] border ${
              isActive ? 'border-slate-800 bg-slate-900/30' : 'border-rose-500/15 bg-rose-550/5 opacity-70'
            }`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                      {m.name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{m.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {m.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      isActive 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                    }`}>
                      {isActive ? 'Active' : 'Departed'}
                    </span>
                    {m.is_guest && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                        Guest
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-1 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Joined on: <span className="text-slate-200">{formatDate(m.joined_at)}</span>
                  </div>
                  {isLeft && (
                    <div className="flex items-center gap-1.5 text-rose-400/90 font-medium">
                      <UserMinus className="w-3.5 h-3.5" />
                      Moved out on: <span className="text-rose-350">{formatDate(m.left_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {isActive && (
                <div className="mt-5 pt-3 border-t border-slate-800/60 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedUser(m);
                      setShowLeaveModal(true);
                    }}
                    className="text-xs text-rose-450 hover:text-rose-400 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Mark as Left
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam"
            required
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. sam@flatmate.com"
            required
          />

          <Input
            label="Join Date"
            type="date"
            value={joinedAt}
            onChange={(e) => setJoinedAt(e.target.value)}
            required
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowAddModal(false)}
              disabled={saving}
              type="button"
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              className="cursor-pointer"
            >
              {saving ? <Spinner size="sm" /> : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Leave Date Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => {
          setShowLeaveModal(false);
          setSelectedUser(null);
        }}
        title={`Set Leave Date for ${selectedUser?.name}`}
      >
        <form onSubmit={handleMarkAsLeft} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-400">
            Set the date when this member moved out of the flat. 
            They will be excluded from all group splits and balance calculations dated after this day.
          </p>

          <Input
            label="Leave Date"
            type="date"
            value={leftAt}
            onChange={(e) => setLeftAt(e.target.value)}
            required
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowLeaveModal(false);
                setSelectedUser(null);
              }}
              disabled={saving}
              type="button"
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              className="cursor-pointer"
            >
              {saving ? <Spinner size="sm" /> : 'Confirm Leave Date'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
