import { cn } from '../../utils/formatters';
import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  error,
  options = [],
  placeholder = 'Select...',
  className = '',
  ...props
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            'w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50',
            'transition-all duration-200 cursor-pointer',
            error && 'border-rose-500/50 focus:ring-rose-500/40'
          )}
          {...props}
        >
          {placeholder && (
            <option value="" className="bg-slate-800 text-slate-400">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-slate-800 text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
