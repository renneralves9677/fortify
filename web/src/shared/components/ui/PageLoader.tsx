import { Loader2 } from 'lucide-react';
import { cn } from '@shared/lib/utils';

export function PageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 animate-fade-up">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-card border border-border bg-card shadow-card">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">Fortify</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 animate-fade-up', className)}>
      <div className="h-8 w-64 animate-pulse rounded-control bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-muted" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-card bg-muted" />
    </div>
  );
}
