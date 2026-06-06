import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@shared/lib/cn';

type ListLoadingOverlayProps = {
  loading?: boolean;
  children: ReactNode;
  className?: string;
};

export function ListLoadingOverlay({ loading, children, className }: ListLoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {loading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-card/75 backdrop-blur-[2px]"
          aria-busy="true"
          aria-label="Carregando"
        >
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      )}
      {children}
    </div>
  );
}
