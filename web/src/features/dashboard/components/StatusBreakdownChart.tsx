import { statusLabels } from '@shared/lib/format';

type StatusRow = { status: string; count: number };

type StatusBreakdownChartProps = {
  rows: StatusRow[];
};

export function StatusBreakdownChart({ rows }: StatusBreakdownChartProps) {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((s, r) => s + r.count, 0);

  if (!total) {
    return <p className="text-sm text-ink-muted">Nenhum contrato cadastrado.</p>;
  }

  return (
    <ul className="space-y-3">
      {sorted.map((row) => {
        const pct = (row.count / total) * 100;
        return (
          <li key={row.status}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="text-ink">{statusLabels[row.status] ?? row.status}</span>
              <span className="font-medium tabular-nums text-ink">
                {row.count}
                <span className="ml-1 text-xs text-ink-muted">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
