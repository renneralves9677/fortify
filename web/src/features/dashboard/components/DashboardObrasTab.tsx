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

  const planned = data.orcamentoPrevisto;
  const realized = data.custoRealizado;
  const committed = data.comprometido;
  const projected = realized + committed;
  const isOver = planned > 0 && projected > planned;
  const usagePct = planned > 0 ? (projected / planned) * 100 : null;
  const committedOver = planned > 0 && committed > planned;
  const overAmount = isOver ? projected - planned : 0;

  const barBase = isOver ? projected : planned;
  const realizedPct = barBase > 0 ? (realized / barBase) * 100 : 0;
  const plannedMarkerPct = isOver && barBase > 0 ? (planned / barBase) * 100 : null;
  const committedPct = barBase > 0 ? (committed / barBase) * 100 : 0;
  const withinCommittedPct =
    isOver && plannedMarkerPct != null
      ? Math.max(0, Math.min(committedPct, plannedMarkerPct - realizedPct))
      : committedPct;
  const overBarPct =
    isOver && plannedMarkerPct != null ? Math.max(0, 100 - plannedMarkerPct) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/obras">
          <Card className="h-full py-4 transition-colors hover:border-brand/40">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Obras ativas</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{data.ativas}</p>
            <p className="text-sm text-ink-muted">
              {data.createdInPeriod} nova{data.createdInPeriod === 1 ? '' : 's'} no período
            </p>
          </Card>
        </Link>
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Custos no período</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(data.custoRealizado)}</p>
          <p className="text-sm text-ink-muted">realizado no intervalo selecionado</p>
        </Card>
      </div>

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
            <p className={cn('font-semibold tabular-nums', committedOver && 'text-danger')}>
              {formatCurrency(data.comprometido)}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Projetado</p>
            <p className={cn('font-semibold tabular-nums', isOver && 'text-danger')}>
              {formatCurrency(projected)}
              {isOver ? (
                <span className="ml-1 text-xs font-normal text-danger">
                  ({formatCurrency(overAmount)} acima do previsto)
                </span>
              ) : (
                usagePct != null && (
                  <span className="ml-1 text-xs font-normal text-ink-muted">
                    ({usagePct.toFixed(0)}% do previsto)
                  </span>
                )
              )}
            </p>
          </div>
        </div>
        {planned > 0 && (
          <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-muted">
            {isOver ? (
              <>
                {realizedPct > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-l-full bg-brand transition-all"
                    style={{ width: `${realizedPct}%` }}
                  />
                )}
                {withinCommittedPct > 0 && (
                  <div
                    className="absolute inset-y-0 bg-brand/35 transition-all"
                    style={{
                      left: `${realizedPct}%`,
                      width: `${withinCommittedPct}%`,
                    }}
                  />
                )}
                {overBarPct > 0 && (
                  <div
                    className="absolute inset-y-0 rounded-r-full bg-danger transition-all"
                    style={{
                      left: `${plannedMarkerPct}%`,
                      width: `${overBarPct}%`,
                    }}
                  />
                )}
                <div
                  className="absolute inset-y-0 w-px bg-background"
                  style={{ left: `${plannedMarkerPct}%` }}
                />
              </>
            ) : (
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.min(usagePct ?? 0, 100)}%` }}
              />
            )}
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
