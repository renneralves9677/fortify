import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@shared/lib/cn';

type TileProps = {
  to: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  footer?: string;
  icon: LucideIcon;
  className?: string;
};

/** Fiori launchpad tile — icon + title + KPI, navigates to a route. */
export function Tile({ to, title, subtitle, value, footer, icon: Icon, className }: TileProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex min-h-[7.5rem] flex-col justify-between rounded-tile border border-border bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          {subtitle && <p className="mt-0.5 truncate text-xs text-ink-muted">{subtitle}</p>}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
          <Icon size={18} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        {value != null && (
          <span className="text-2xl font-semibold tabular-nums text-ink">{value}</span>
        )}
        {footer && <span className="text-xs text-ink-subtle">{footer}</span>}
      </div>
    </Link>
  );
}
