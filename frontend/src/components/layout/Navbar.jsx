import { Menu, LogOut, ChevronDown, Plus, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { getInitials, cn } from '../../utils/formatters';
import { useState, useRef, useEffect } from 'react';

export default function Navbar({ onMenuClick, groups, currentGroup, onSelectGroup, onCreateGroup }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const groupRef = useRef(null);
  const userRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (groupRef.current && !groupRef.current.contains(e.target)) {
        setShowGroupDropdown(false);
        setShowNewGroup(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await onCreateGroup(newGroupName.trim());
    setNewGroupName('');
    setShowNewGroup(false);
    setShowGroupDropdown(false);
  };

  return (
    <header className="glass-strong border-b border-white/5 px-4 lg:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-navy-800/60 text-slate-400 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Group selector */}
        <div className="relative" ref={groupRef}>
          <button
            onClick={() => setShowGroupDropdown(!showGroupDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-navy-800/60 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white">
              {currentGroup?.name?.[0] || 'G'}
            </div>
            <span className="text-sm font-medium text-white hidden sm:block">
              {currentGroup?.name || 'Select Group'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showGroupDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 glass-strong rounded-xl shadow-2xl shadow-black/40 py-2 animate-scale-in">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Groups</p>
              </div>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    onSelectGroup(group);
                    setShowGroupDropdown(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer',
                    currentGroup?.id === group.id
                      ? 'bg-sky-500/10 text-sky-400'
                      : 'text-slate-350 hover:bg-navy-800/65'
                  )}
                >
                  <div className="w-6 h-6 rounded-md bg-navy-800 flex items-center justify-center text-[10px] font-bold text-slate-350">
                    {group.name[0]}
                  </div>
                  {group.name}
                </button>
              ))}
              <div className="border-t border-slate-700/20 mt-1 pt-1">
                {showNewGroup ? (
                  <div className="px-3 py-2 flex gap-2">
                    <input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                      placeholder="Group name..."
                      className="flex-1 bg-navy-850 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateGroup}
                      className="px-3 py-1.5 bg-sky-500 text-white text-xs rounded-lg hover:bg-sky-400 transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewGroup(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-sky-400 hover:bg-navy-800/60 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    New Group
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right - Theme switcher & User menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-navy-800/60 transition-all duration-300 text-slate-450 hover:text-white cursor-pointer relative overflow-hidden"
          aria-label="Toggle theme"
        >
          <div className="relative w-5 h-5">
            <Sun className={cn(
              "w-5 h-5 absolute inset-0 transition-transform duration-500 ease-out",
              theme === 'light' ? "rotate-0 scale-100" : "rotate-90 scale-0"
            )} />
            <Moon className={cn(
              "w-5 h-5 absolute inset-0 transition-transform duration-500 ease-out",
              theme === 'dark' ? "rotate-0 scale-100" : "-rotate-90 scale-0"
            )} />
          </div>
        </button>

        {/* User menu */}
        <div className="relative" ref={userRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-navy-800/60 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white">
            {getInitials(user?.name)}
          </div>
          <span className="text-sm font-medium text-slate-300 hidden sm:block">
            {user?.name}
          </span>
        </button>

        {showUserMenu && (
          <div className="absolute top-full right-0 mt-2 w-48 glass-strong rounded-xl shadow-2xl shadow-black/40 py-2 animate-scale-in">
            <div className="px-4 py-2 border-b border-white/5">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                setShowUserMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-400 hover:bg-navy-800/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
