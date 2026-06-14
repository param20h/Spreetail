import { cn } from '../../utils/formatters';

export default function Card({
  children,
  className = '',
  hover = false,
  glow = false,
  padding = 'p-5',
  ...props
}) {
  return (
    <div
      className={cn(
        'glass rounded-2xl',
        padding,
        hover && 'hover:bg-slate-700/50 hover:border-slate-500/20 transition-all duration-300 cursor-pointer hover:-translate-y-0.5',
        glow && 'animate-pulse-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={cn('text-lg font-semibold text-white', className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }) {
  return <div className={cn('', className)}>{children}</div>;
}
