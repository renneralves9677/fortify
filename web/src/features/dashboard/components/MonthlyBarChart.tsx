import { formatCurrency } from '@shared/lib/format';
import { cn } from '@shared/lib/cn';

export type BarSeries = {
  key: string;
  label: string;
  value: number;
  secondary?: number;
};

type MonthlyBarChartProps = {
  data: BarSeries[];
  valueFormatter?: (value: number) => string;
  primaryLabel?: string;
  secondaryLabel?: string;
  className?: string;
};

function compactValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(Math.round(value));
}

export function MonthlyBarChart({
  data,
  valueFormatter = compactValue,
  primaryLabel = 'Valor',
  secondaryLabel,
  className,
}: MonthlyBarChartProps) {
  const max = Math.max(...data.map((d) => Math.max(d.value, d.secondary ?? 0)), 1);

  if (!data.length) {
    return <p className="text-sm text-ink-muted">Sem dados no período selecionado.</p>;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {secondaryLabel && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-brand" />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-brand/35" />
            {secondaryLabel}
          </span>
        </div>
      )}
      <div className="flex items-end gap-2" style={{ minHeight: 120 }}>
        {data.map((row) => {
          const h = Math.max((row.value / max) * 88, row.value > 0 ? 6 : 2);
          const h2 = row.secondary != null ? Math.max((row.secondary / max) * 88, row.secondary > 0 ? 6 : 2) : 0;
          return (
            <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium tabular-nums text-ink-muted">
                {valueFormatter(row.value)}
              </span>
              <div className="flex w-full max-w-[2.75rem] items-end justify-center gap-0.5">
                <div
                  className="w-1/2 rounded-t-sm bg-brand/80 transition-all"
                  style={{ height: h }}
                  title={`${primaryLabel}: ${formatCurrency(row.value)}`}
                />
                {row.secondary != null && (
                  <div
                    className="w-1/2 rounded-t-sm bg-brand/30 transition-all"
                    style={{ height: h2 }}
                    title={`${secondaryLabel ?? 'Secundário'}: ${row.secondary}`}
                  />
                )}
              </div>
              <span className="max-w-full truncate text-center text-[10px] capitalize text-ink-muted">
                {row.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
