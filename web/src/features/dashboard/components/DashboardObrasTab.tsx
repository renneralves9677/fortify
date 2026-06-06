import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, HardHat, ShoppingCart } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { formatCurrency } from '@shared/lib/format';
import { cn } from '@shared/lib/cn';
import { MonthlyBarChart } from '@features/dashboard/components/MonthlyBarChart';
import type { DashboardData } from '@features/dashboard/types';

type Props = {
  data: DashboardData['obras'];
};

export function DashboardObrasTab({ data }: Props) {
  const monthlyBars = data.monthly.map((row) => ({
    key: row.month,
    label: row.label,
    value: row.custos,
    secondary: row.obras,
  }));

  const projected = data.custoRealizado + data.comprometido;
  const usagePct =
    data.orcamentoPrevisto > 0 ? (projected / data.orcamentoPrevisto) * 100 : null;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Orçamento das obras ativas</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-ink-muted">Previsto</p>
            <p className="font-semibold tabular-nums">{formatCurrency(data.orcamentoPrevisto)}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Realizado (período)</p>
            <p className="font-semibold tabular-nums">{formatCurrency(data.custoRealizado)}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Comprometido</p>
            <p className="font-semibold tabular-nums">{formatCurrency(data.comprometido)}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Projetado</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(projected)}
              {usagePct != null && (
                <span className="ml-1 text-xs font-normal text-ink-muted">
                  ({usagePct.toFixed(0)}% do previsto)
                </span>
              )}
            </p>
          </div>
        </div>
        {data.orcamentoPrevisto > 0 && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.min(usagePct ?? 0, 100)}%` }}
            />
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-medium text-ink">Custos mensais</h3>
          <MonthlyBarChart
            data={monthlyBars}
            primaryLabel="Custos (R$)"
            secondaryLabel="Novas obras"
          />
        </Card>
        <Card>
          <h3 className="mb-4 font-medium text-ink">Por categoria</h3>
          {!data.byCategory.length ? (
            <p className="text-sm text-ink-muted">Sem lançamentos no período.</p>
          ) : (
            <ul className="space-y-3">
              {data.byCategory.slice(0, 6).map((row) => (
                <li key={row.label}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">{row.label}</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(row.amount)}
                      <span className="ml-1 text-xs text-ink-muted">
                        ({row.sharePct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${row.sharePct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {(data.ocorrenciasAbertas > 0 || data.ocPendentes > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.ocorrenciasAbertas > 0 && (
            <Card className="flex items-center gap-3 border-warning/30 bg-warning/5 py-3">
              <AlertTriangle size={18} className="text-warning" aria-hidden />
              <div>
                <p className="text-sm font-medium">{data.ocorrenciasAbertas} ocorrência(s) aberta(s)</p>
                <p className="text-xs text-ink-muted">Pendências em obras</p>
              </div>
            </Card>
          )}
          {data.ocPendentes > 0 && (
            <Card className="flex items-center gap-3 border-brand/20 bg-brand/5 py-3">
              <ShoppingCart size={18} className="text-brand" aria-hidden />
              <div>
                <p className="text-sm font-medium">{data.ocPendentes} O.C. pendente(s)</p>
                <p className="text-xs text-ink-muted">Emitidas ou aprovadas</p>
              </div>
            </Card>
          )}
        </div>
      )}

      <Link
        to="/obras"
        className={cn(
          'inline-flex h-8 items-center gap-2 rounded-control border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted',
        )}
      >
        <HardHat size={16} aria-hidden />
        Ver obras
        <ArrowRight size={14} className="opacity-60" aria-hidden />
      </Link>
    </div>
  );
}
