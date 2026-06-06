import { formatCurrency, formatDate, statusLabels } from '@shared/lib/format';
import { Badge } from '@shared/components/ui/Badge';
import { computeBudgetSummary } from '@features/obras/lib/budget-summary';
import type { ObraPurchaseOrder } from '@features/obras/types';

const vistoriaTypeLabels: Record<string, string> = {
  INICIAL: 'Inicial',
  INTERMEDIARIA: 'Intermediária',
  FINAL: 'Final',
  MANUTENCAO: 'Manutenção',
};

export type ObraClosePreviewData = {
  name: string;
  address?: string | null;
  budgetPlanned?: number;
  budgetRealized?: number;
  contract?: { title: string; partyName?: string } | null;
  steps?: { title: string; done: boolean }[];
  custos?: { category: string; description: string; amount: number; date: string }[];
  vistorias?: { type: string; description: string; createdAt: string }[];
  purchaseOrders?: Pick<
    ObraPurchaseOrder,
    'number' | 'description' | 'amount' | 'status' | 'receivedAmount'
  >[];
};

type Props = {
  obra: ObraClosePreviewData;
  blockers?: string[];
  warnings: string[];
  canClose?: boolean;
  complete: boolean;
  onOpenReport?: () => void;
};

export function ObraClosePreview({
  obra,
  blockers = [],
  warnings,
  canClose = true,
  complete,
  onOpenReport,
}: Props) {
  const steps = obra.steps ?? [];
  const stepsDone = steps.filter((s) => s.done).length;
  const custos = obra.custos ?? [];
  const vistorias = obra.vistorias ?? [];
  const orders = obra.purchaseOrders ?? [];
  const budget = computeBudgetSummary({
    budgetPlanned: obra.budgetPlanned ?? 0,
    budgetRealized: obra.budgetRealized ?? 0,
    purchaseOrders: orders as ObraPurchaseOrder[],
  });

  return (
    <div className="space-y-4 text-sm">
      <section className="rounded-control border border-border bg-surface-sunken/50 p-3">
        <h4 className="font-medium text-ink">Resumo da obra</h4>
        <dl className="mt-2 space-y-1.5 text-ink-muted">
          {obra.contract && (
            <div className="flex justify-between gap-4">
              <dt>Contrato</dt>
              <dd className="text-right text-ink">{obra.contract.title}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt>Roteiro</dt>
            <dd className="text-ink">
              {stepsDone}/{steps.length} etapa{steps.length === 1 ? '' : 's'} concluída
              {stepsDone === 1 ? '' : 's'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Orçamento</dt>
            <dd className="text-right text-ink">
              {formatCurrency(budget.realized)} realizado
              {budget.planned > 0 && (
                <span className="text-ink-muted"> / {formatCurrency(budget.planned)} previsto</span>
              )}
            </dd>
          </div>
          {budget.planned > 0 && budget.committed > 0 && (
            <div className="flex justify-between gap-4">
              <dt>Comprometido (O.C.)</dt>
              <dd className="text-ink">{formatCurrency(budget.committed)}</dd>
            </div>
          )}
          {budget.planned > 0 && (
            <div className="flex justify-between gap-4">
              <dt>Projetado total</dt>
              <dd className={budget.projected > budget.planned ? 'text-danger' : 'text-ink'}>
                {formatCurrency(budget.projected)}
                {budget.available < 0 && (
                  <span className="text-ink-muted">
                    {' '}
                    ({formatCurrency(Math.abs(budget.available))} acima)
                  </span>
                )}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt>Custos lançados</dt>
            <dd className="text-ink">{custos.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Vistorias</dt>
            <dd className="text-ink">{vistorias.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Ordens de compra</dt>
            <dd className="text-ink">{orders.length}</dd>
          </div>
        </dl>
      </section>

      {steps.length > 0 && (
        <section>
          <h4 className="font-medium text-ink">Etapas do roteiro</h4>
          <ul className="mt-2 space-y-1">
            {steps.map((step, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-ink-muted">
                <span className={step.done ? 'line-through' : ''}>{step.title}</span>
                <Badge
                  status={step.done ? 'COMPLETED' : 'PENDENTE'}
                  label={step.done ? 'Concluída' : 'Pendente'}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {custos.length > 0 && (
        <section>
          <h4 className="font-medium text-ink">Custos</h4>
          <ul className="mt-2 space-y-1 text-ink-muted">
            {custos.map((c, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">
                  {c.category} — {c.description}
                </span>
                <span className="shrink-0 tabular-nums text-ink">
                  {formatCurrency(c.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {vistorias.length > 0 && (
        <section>
          <h4 className="font-medium text-ink">Vistorias</h4>
          <ul className="mt-2 space-y-1 text-ink-muted">
            {vistorias.map((v, i) => (
              <li key={i}>
                <span className="font-medium text-ink">
                  {vistoriaTypeLabels[v.type] ?? v.type}
                </span>
                {' — '}
                {v.description}
                <span className="text-ink-subtle"> · {formatDate(v.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {orders.length > 0 && (
        <section>
          <h4 className="font-medium text-ink">Ordens de compra</h4>
          <ul className="mt-2 space-y-1.5">
            {orders.map((o, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-ink-muted">
                <span className="min-w-0">
                  {o.number} — {o.description}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-ink">{formatCurrency(o.amount)}</span>
                  <Badge status={o.status} label={statusLabels[o.status] ?? o.status} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {blockers.length > 0 && (
        <section className="rounded-control border border-danger/40 bg-danger/10 p-3">
          <h4 className="font-medium text-ink">Bloqueios para encerramento</h4>
          <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      {warnings.length > 0 && (
        <section className="rounded-control border border-warning/40 bg-warning/10 p-3">
          <h4 className="font-medium text-ink">Avisos (não bloqueiam)</h4>
          <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {onOpenReport && (
        <div>
          <button
            type="button"
            className="text-sm font-medium text-brand hover:underline"
            onClick={onOpenReport}
          >
            Ver relatório completo →
          </button>
        </div>
      )}

      <p className="text-ink-muted">
        {!canClose
          ? 'Registre as vistorias inicial e final antes de encerrar a obra.'
          : complete
            ? 'Todos os registros recomendados estão presentes. Confirma o encerramento desta obra?'
            : 'Existem avisos, mas você pode encerrar a obra. Confirma o encerramento?'}
      </p>
    </div>
  );
}
