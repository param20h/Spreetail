import { cn } from '../../utils/formatters';

const colorMap = {
  teal: 'bg-teal-500/15 text-teal-400 border border-teal-500/25',
  emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  rose: 'bg-rose-500/15 text-rose-400 border border-rose-500/25',
  amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  slate: 'bg-slate-500/15 text-slate-400 border border-slate-500/25',
  purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
  blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
};

const splitTypeColors = {
  equal: 'teal',
  unequal: 'amber',
  percentage: 'purple',
  share: 'blue',
};

export default function Badge({
  children,
  color = 'teal',
  splitType,
  className = '',
  dot = false,
}) {
  const resolvedColor = splitType ? splitTypeColors[splitType] || 'slate' : color;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full',
        colorMap[resolvedColor],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            resolvedColor === 'emerald' && 'bg-emerald-400',
            resolvedColor === 'rose' && 'bg-rose-400',
            resolvedColor === 'teal' && 'bg-teal-400',
            resolvedColor === 'amber' && 'bg-amber-400',
            resolvedColor === 'slate' && 'bg-slate-400',
            resolvedColor === 'purple' && 'bg-purple-400',
            resolvedColor === 'blue' && 'bg-blue-400'
          )}
        />
      )}
      {children}
    </span>
  );
}
