import { cn } from '../../utils/formatters';

export default function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="relative">
        <div
          className={cn(
            'rounded-full border-2 border-slate-700',
            sizeClasses[size]
          )}
        />
        <div
          className={cn(
            'absolute top-0 left-0 rounded-full border-2 border-transparent border-t-teal-400 animate-spin',
            sizeClasses[size]
          )}
        />
      </div>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-slate-400 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
