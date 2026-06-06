import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import { Breadcrumbs } from '@shared/components/shell/Breadcrumbs';

/**
 * Object/dynamic-page header inspired by Ant PageContainer + Fiori dynamic page.
 * Breadcrumb · title/subtitle · status · right-aligned actions · optional tabs strip.
 */
export function PageHeader({
  title,
  description,
  actions,
  status,
  breadcrumbs = true,
  backTo,
  backLabel,
  tabs,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  status?: ReactNode;
  breadcrumbs?: boolean;
  /** Rota de retorno — exibe seta à esquerda do título */
  backTo?: string;
  /** Texto ao lado da seta de voltar (ex.: "Voltar") */
  backLabel?: string;
  tabs?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && (
        <div className="mb-2">
          <Breadcrumbs />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {backTo && (
            <Link
              to={backTo}
              aria-label={backLabel ?? 'Voltar'}
              className="group mb-2 inline-flex items-center gap-1 rounded-sm py-0.5 text-sm font-medium text-ink-muted transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <ArrowLeft
                size={16}
                strokeWidth={2}
                className="transition-transform group-hover:-translate-x-0.5"
              />
              {backLabel ?? 'Voltar'}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            {status}
          </div>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="mt-4 border-b border-border">{tabs}</div>}
    </div>
  );
}
