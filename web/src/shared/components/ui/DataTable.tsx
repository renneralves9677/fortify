import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@shared/lib/cn';
import { TablePagination } from '@shared/components/ui/TablePagination';

type DataTableProps = {
  columns: { key: string; label: string; className?: string }[];
  rows: Record<string, React.ReactNode>[];
  empty?: React.ReactNode;
  /** Toolbar title (Fiori/Ant table header). */
  title?: string;
  /** Item count shown next to the title. Defaults to rows.length when title is set. */
  count?: number;
  /** Right-aligned toolbar actions. */
  actions?: ReactNode;
  /** Search box props — pass to enable the toolbar search field. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Optional filter bar rendered below the toolbar header. */
  filters?: ReactNode;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
};

export function DataTable({
  columns,
  rows,
  empty,
  title,
  count,
  actions,
  search,
  filters,
  pagination,
}: DataTableProps) {
  const hasToolbar = Boolean(title || actions || search);

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      {hasToolbar && (
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-ink-muted">
              {count ?? rows.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {search && (
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle"
                />
                <input
                  type="search"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  placeholder={search.placeholder ?? 'Buscar…'}
                  className="h-8 w-full rounded-control border border-input bg-background pl-8 pr-3 text-sm placeholder:text-ink-subtle focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-56"
                />
              </div>
            )}
            {actions}
          </div>
        </div>
      )}
      {filters && <div className="border-b border-border px-4 py-3">{filters}</div>}

      {!rows.length && empty ? (
        <div className="p-4">{empty}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-sunken/60">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted', c.className)}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-2.5 text-ink', c.className)}>
                      {row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination && (
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
