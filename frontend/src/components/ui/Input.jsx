import { cn } from '../../utils/formatters';

export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  inputClassName = '',
  type = 'text',
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
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          className={cn(
            'w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-theme-primary',
            'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40',
            'transition-all duration-200',
            error && 'border-rose-500/50 focus:ring-rose-500/40 focus:border-rose-500/50',
            Icon && 'pl-10',
            inputClassName
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-rose-400" />
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  error,
  className = '',
  rows = 3,
  ...props
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={cn(
          'w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-theme-primary',
          'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40',
          'transition-all duration-200 resize-none',
          error && 'border-rose-500/50 focus:ring-rose-500/40'
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
}
