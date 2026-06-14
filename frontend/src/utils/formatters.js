/**
 * Format a number as currency
 */
export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount);
  if (isNaN(num)) return '—';

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format date to readable string
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return formatDate(dateStr);
}

/**
 * Get initials from name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get color class for balance
 */
export function getBalanceColor(amount) {
  const num = Number(amount);
  if (num > 0) return 'text-emerald-400';
  if (num < 0) return 'text-rose-400';
  return 'text-slate-400';
}

/**
 * Get background color class for balance
 */
export function getBalanceBg(amount) {
  const num = Number(amount);
  if (num > 0) return 'bg-emerald-500/10 border-emerald-500/20';
  if (num < 0) return 'bg-rose-500/10 border-rose-500/20';
  return 'bg-slate-500/10 border-slate-500/20';
}

/**
 * Classname joiner
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
