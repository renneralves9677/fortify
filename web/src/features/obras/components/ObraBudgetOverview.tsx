import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardList,
  Pencil,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import type { ObraCusto, ObraPurchaseOrder } from '@features/obras/types';
import {
  computeBudgetSummary,
  getBudgetGaugeHint,
  getBudgetStatusLabel,
  type BudgetStatus,
} from '@features/obras/lib/budget-summary';
import {
  formatCurrency,
  formatCurrencyInputFromNumber,
  parseCurrencyInput,
} from '@shared/lib/format';
import { CurrencyInput } from '@shared/components/ui/CurrencyInput';
import { cn } from '@shared/lib/cn';

type ObraBudgetOverviewProps = {
  budgetPlanned: number;
  budgetRealized: number;
  custos?: ObraCusto[];
  purchaseOrders?: ObraPurchaseOrder[];
  compact?: boolean;
  canEdit?: boolean;
  budgetUpdating?: boolean;
  onGoToCustos?: () => void;
  onBudgetUpdate?: (budgetPlanned: number) => void;
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
  isOver,
  size = 'lg',
}: {
  pct: number;
  status: BudgetStatus;
  isOver?: boolean;
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
        <span
          className={cn(
            'font-semibold text-ink',
            isOver ? 'text-base uppercase tracking-wide' : 'tabular-nums',
            size === 'lg' ? (isOver ? 'text-lg' : 'text-2xl') : isOver ? 'text-sm' : 'text-lg',
          )}
        >
          {isOver ? 'Estouro' : `${pct.toFixed(0)}%`}
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

  const isOver = projected > planned;
  const base = isOver ? projected : planned;
  const realizedPct = Math.min((realized / base) * 100, 100);
  const committedPct = Math.min((committed / base) * 100, 100 - realizedPct);
  const plannedMarkerPct = isOver ? Math.min((planned / base) * 100, 100) : null;
  const withinCommittedPct =
    isOver && plannedMarkerPct != null
      ? Math.max(0, Math.min(committedPct, plannedMarkerPct - realizedPct))
      : committedPct;
  const overBarPct =
    isOver && plannedMarkerPct != null ? Math.max(0, 100 - plannedMarkerPct) : 0;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-full">
        <div className="relative h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-brand transition-all"
            style={{ width: `${realizedPct}%` }}
          />
          {withinCommittedPct > 0 && (
            <div
              className="absolute inset-y-0 rounded-full bg-brand/35 transition-all"
              style={{
                left: `${realizedPct}%`,
                width: `${withinCommittedPct}%`,
                backgroundImage:
                  'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 6px)',
              }}
            />
          )}
          {isOver && overBarPct > 0 && (
            <div
              className="absolute inset-y-0 rounded-r-full bg-danger transition-all"
              style={{
                left: `${plannedMarkerPct}%`,
                width: `${overBarPct}%`,
              }}
            />
          )}
          {isOver && (
            <div
              className="absolute inset-y-0 w-0.5 bg-background shadow-sm"
              style={{ left: `${plannedMarkerPct}%` }}
              title={`Orçamento previsto: ${formatCurrency(planned)}`}
            />
          )}
        </div>
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
        {isOver && (
          <>
            <span className="flex items-center gap-1.5 text-danger">
              <span className="inline-block h-2 w-2 rounded-full bg-danger" />
              Acima do previsto
            </span>
            <span className="flex items-center gap-1.5 text-danger">
              <span className="inline-block h-2 w-0.5 rounded-full bg-background ring-1 ring-danger" />
              Limite previsto
            </span>
            <span className="text-ink-muted">
              Escala pelo projetado ({formatCurrency(projected)})
            </span>
          </>
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
  canEdit = false,
  budgetUpdating = false,
  onGoToCustos,
  onBudgetUpdate,
}: ObraBudgetOverviewProps) {
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    if (budgetDialogOpen) {
      setBudgetInput(budgetPlanned > 0 ? formatCurrencyInputFromNumber(budgetPlanned) : '');
    }
  }, [budgetDialogOpen, budgetPlanned]);

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
  const gaugeHint = getBudgetGaugeHint(summary);
  const canEditBudget = canEdit && !!onBudgetUpdate;

  function handleBudgetSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseCurrencyInput(budgetInput);
    if (amount < 0) return;
    onBudgetUpdate?.(amount);
    setBudgetDialogOpen(false);
  }

  const budgetDialog = canEditBudget ? (
    <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleBudgetSubmit}>
          <DialogHeader>
            <DialogTitle>Orçamento previsto</DialogTitle>
            <DialogDescription>
              Valor de referência para o controle orçamentário desta obra.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CurrencyInput
              label="Valor (R$)"
              value={budgetInput}
              onChange={setBudgetInput}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setBudgetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={budgetUpdating}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  ) : null;

  if (summary.planned <= 0) {
    return (
      <>
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
            <div className="flex flex-wrap gap-2">
              {canEditBudget && (
                <Button variant="secondary" size="sm" onClick={() => setBudgetDialogOpen(true)}>
                  Definir orçamento
                </Button>
              )}
              {onGoToCustos && summary.realized > 0 && (
                <Button variant="secondary" size="sm" onClick={onGoToCustos}>
                  Ver lançamentos
                </Button>
              )}
            </div>
          </div>
        </Card>
        {budgetDialog}
      </>
    );
  }

  return (
    <>
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
            isOver={summary.status === 'over'}
            size={compact ? 'sm' : 'lg'}
          />
          {!compact && (
            <p className="max-w-[12rem] text-center text-xs text-ink-muted">{gaugeHint}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <CircleDollarSign size={18} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Orçamento previsto
                  </p>
                  {canEditBudget && (
                    <button
                      type="button"
                      className="rounded p-0.5 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
                      aria-label="Editar orçamento previsto"
                      onClick={() => setBudgetDialogOpen(true)}
                    >
                      <Pencil size={14} aria-hidden />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-ink">
                  {formatCurrency(summary.planned)}
                </p>
              </div>
            </div>
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

    {budgetDialog}
    </>
  );
}
