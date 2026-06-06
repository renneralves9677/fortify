import { useMemo } from 'react';
import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardList,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import type { ObraCusto, ObraPurchaseOrder } from '@features/obras/types';
import {
  computeBudgetSummary,
  getBudgetStatusLabel,
  type BudgetStatus,
} from '@features/obras/lib/budget-summary';
import { formatCurrency } from '@shared/lib/format';
import { cn } from '@shared/lib/cn';

type ObraBudgetOverviewProps = {
  budgetPlanned: number;
  budgetRealized: number;
  custos?: ObraCusto[];
  purchaseOrders?: ObraPurchaseOrder[];
  compact?: boolean;
  onGoToCustos?: () => void;
};

function statusBadgeVariant(status: BudgetStatus): 'success' | 'warning' | 'destructive' | 'muted' {
  switch (status) {
    case 'ok':
      return 'success';
    case 'warning':
      return 'warning';
    case 'over':
      return 'destructive';
    default:
      return 'muted';
  }
}

function BudgetGauge({
  pct,
  status,
  size = 'lg',
}: {
  pct: number;
  status: BudgetStatus;
  size?: 'lg' | 'sm';
}) {
  const dim = size === 'lg' ? 140 : 96;
  const stroke = size === 'lg' ? 10 : 8;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const strokeClass =
    status === 'over'
      ? 'text-danger'
      : status === 'warning'
        ? 'text-warning'
        : status === 'ok'
          ? 'text-brand'
          : 'text-muted';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90" aria-hidden>
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('stroke-current transition-all duration-500', strokeClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn('font-semibold tabular-nums text-ink', size === 'lg' ? 'text-2xl' : 'text-lg')}>
          {pct.toFixed(0)}%
        </span>
        <span className="text-xs text-ink-muted">projetado</span>
      </div>
    </div>
  );
}

function MetricRow({
  icon,
  label,
  value,
  hint,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className={cn('mt-0.5 text-base font-semibold tabular-nums text-ink', valueClassName)}>
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
}

function StackedBudgetBar({
  planned,
  realized,
  committed,
  projected,
}: {
  planned: number;
  realized: number;
  committed: number;
  projected: number;
}) {
  if (planned <= 0) return null;

  const base = planned;
  const realizedPct = Math.min((realized / base) * 100, 100);
  const committedPct = Math.min((committed / base) * 100, 100 - realizedPct);
  const overPct =
    projected > planned ? Math.min(((projected - planned) / base) * 100, 50) : 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-brand transition-all"
            style={{ width: `${realizedPct}%` }}
          />
          <div
            className="absolute inset-y-0 rounded-full bg-brand/35 transition-all"
            style={{
              left: `${realizedPct}%`,
              width: `${committedPct}%`,
              backgroundImage:
                'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 6px)',
            }}
          />
        </div>
        {overPct > 0 && (
          <div
            className="absolute top-0 h-3 rounded-r-full bg-danger transition-all"
            style={{ left: '100%', width: `${overPct}%` }}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-brand" />
          Realizado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-brand/40" />
          Comprometido (O.C.)
        </span>
        {projected > planned && (
          <span className="flex items-center gap-1.5 text-danger">
            <span className="inline-block h-2 w-2 rounded-full bg-danger" />
            Acima do previsto
          </span>
        )}
      </div>
    </div>
  );
}

export function ObraBudgetOverview({
  budgetPlanned,
  budgetRealized,
  custos = [],
  purchaseOrders = [],
  compact = false,
  onGoToCustos,
}: ObraBudgetOverviewProps) {
  const summary = useMemo(
    () =>
      computeBudgetSummary({
        budgetPlanned,
        budgetRealized,
        purchaseOrders,
        custos,
      }),
    [budgetPlanned, budgetRealized, purchaseOrders, custos],
  );

  const statusLabel = getBudgetStatusLabel(summary.status);
  const maxMonth = Math.max(...summary.byMonth.map((m) => m.amount), 1);

  if (summary.planned <= 0) {
    return (
      <Card className="border-dashed">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Controle orçamentário
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">Orçamento não definido</p>
            <p className="mt-1 text-sm text-ink-muted">
              Total realizado: <strong className="text-ink">{formatCurrency(summary.realized)}</strong>
              {summary.committed > 0 && (
                <>
                  {' '}
                  · Comprometido: <strong className="text-ink">{formatCurrency(summary.committed)}</strong>
                </>
              )}
            </p>
          </div>
          {onGoToCustos && summary.realized > 0 && (
            <Button variant="secondary" size="sm" onClick={onGoToCustos}>
              Ver lançamentos
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(compact ? 'py-4' : 'py-5')}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Controle orçamentário
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-ink">Previsto vs. realizado</h3>
            <Badge variant={statusBadgeVariant(summary.status)} label={statusLabel} />
          </div>
        </div>
        {onGoToCustos && (
          <Button variant="secondary" size="sm" onClick={onGoToCustos}>
            Ver lançamentos
          </Button>
        )}
      </div>

      <div
        className={cn(
          'grid gap-6',
          compact ? 'md:grid-cols-[auto_1fr]' : 'lg:grid-cols-[auto_1fr]',
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <BudgetGauge
            pct={summary.projectedPctGauge}
            status={summary.status}
            size={compact ? 'sm' : 'lg'}
          />
          {!compact && (
            <p className="max-w-[10rem] text-center text-xs text-ink-muted">
              {summary.projectedPct != null && summary.projectedPct > 100
                ? `${(summary.projectedPct - 100).toFixed(0)}% acima do previsto`
                : `${summary.projectedPct?.toFixed(0) ?? 0}% do orçamento em uso`}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricRow
              icon={<CircleDollarSign size={18} aria-hidden />}
              label="Orçamento previsto"
              value={formatCurrency(summary.planned)}
            />
            <MetricRow
              icon={<Receipt size={18} aria-hidden />}
              label="Realizado"
              value={formatCurrency(summary.realized)}
              hint={
                summary.usagePct != null
                  ? `${summary.usagePct.toFixed(0)}% do previsto já lançado`
                  : undefined
              }
            />
            <MetricRow
              icon={<ClipboardList size={18} aria-hidden />}
              label="Comprometido"
              value={formatCurrency(summary.committed)}
              hint="O.C. aprovadas ainda não recebidas"
            />
            <MetricRow
              icon={
                summary.available >= 0 ? (
                  <PiggyBank size={18} aria-hidden />
                ) : (
                  <AlertTriangle size={18} aria-hidden />
                )
              }
              label="Saldo disponível"
              value={formatCurrency(summary.available)}
              valueClassName={summary.available < 0 ? 'text-danger' : undefined}
              hint={
                summary.available >= 0
                  ? 'Previsto menos realizado e comprometido'
                  : 'Projeção acima do orçamento'
              }
            />
          </div>

          <StackedBudgetBar
            planned={summary.planned}
            realized={summary.realized}
            committed={summary.committed}
            projected={summary.projected}
          />

          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
            <span className="flex items-center gap-1.5">
              {summary.available >= 0 ? (
                <TrendingDown size={16} className="text-success" aria-hidden />
              ) : (
                <TrendingUp size={16} className="text-danger" aria-hidden />
              )}
              Projetado: <strong className="text-ink">{formatCurrency(summary.projected)}</strong>
            </span>
          </div>
        </div>
      </div>

      {!compact && summary.byCategory.length > 0 && (
        <div className="mt-6 grid gap-6 border-t border-border pt-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Por categoria
            </p>
            <ul className="space-y-3">
              {summary.byCategory.map((row) => (
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
          </div>

          {summary.byMonth.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Evolução mensal
              </p>
              <div className="flex items-end gap-2" style={{ minHeight: 100 }}>
                {summary.byMonth.map((row) => {
                  const h = Math.max((row.amount / maxMonth) * 80, 4);
                  return (
                    <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-medium tabular-nums text-ink-muted">
                        {row.amount >= 1000
                          ? `${(row.amount / 1000).toFixed(0)}k`
                          : row.amount.toFixed(0)}
                      </span>
                      <div
                        className="w-full max-w-[2.5rem] rounded-t-sm bg-brand/80 transition-all"
                        style={{ height: h }}
                        title={formatCurrency(row.amount)}
                      />
                      <span className="text-[10px] capitalize text-ink-muted">{row.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
