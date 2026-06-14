import { cn } from '../../utils/formatters';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white shadow-lg shadow-sky-500/15 hover:shadow-sky-500/25',
  secondary:
    'bg-navy-800/80 hover:bg-navy-800 text-slate-200 border border-white/5 hover:border-white/10',
  danger:
    'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-lg shadow-rose-500/15',
  ghost:
    'bg-transparent hover:bg-navy-800/60 text-slate-400 hover:text-white',
  outline:
    'bg-transparent border border-sky-500/20 text-sky-400 hover:bg-sky-500/5 hover:border-sky-500/35',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  icon: Icon,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        'active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:ring-offset-0',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}
