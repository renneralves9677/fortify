import { Calendar, HardHat, Package, Receipt, Tag, Truck, Wrench, type LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Badge } from '@shared/components/ui/Badge';
import { formatCurrency, formatDate, formatDateTime } from '@shared/lib/format';
import { RecordCreatorSection } from '@features/obras/components/RecordCreatorSection';
import type { ObraCusto } from '@features/obras/types';

type CustoDetailModalProps = {
  custo: ObraCusto | null;
  open: boolean;
  onClose: () => void;
  budgetPlanned?: number;
};

export function CustoDetailModal({ custo, open, onClose, budgetPlanned }: CustoDetailModalProps) {
  if (!custo) return null;

  const shareOfBudget =
    budgetPlanned && budgetPlanned > 0
      ? Math.round((custo.amount / budgetPlanned) * 1000) / 10
      : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Lançamento de custo</DialogTitle>
            <Badge status="ATIVO" label={custo.categoryLabel ?? custo.category} />
            {custo.purchaseOrderId && (
              <Badge status="PENDENTE" label="Via O.C." />
            )}
          </div>
          <DialogDescription>
            Registrado em {formatDateTime(custo.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RecordCreatorSection creator={custo.createdBy} />

          <div className="rounded-control border border-border bg-surface-sunken/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Valor</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {formatCurrency(custo.amount)}
            </p>
            {shareOfBudget != null && (
              <p className="mt-1 text-sm text-ink-muted">
                {shareOfBudget}% do orçamento previsto
              </p>
            )}
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Tag size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Categoria</dt>
                <dd className="mt-0.5 font-medium text-ink">{custo.categoryLabel ?? custo.category}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Receipt size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Descrição</dt>
                <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed text-ink">
                  {custo.description}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Data do lançamento</dt>
                <dd className="mt-0.5 text-ink">{formatDate(custo.date)}</dd>
              </div>
            </div>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function categoryIcon(category: string): LucideIcon {
  const key = category.toLowerCase();
  if (key.includes('material')) return Package;
  if (key.includes('mão') || key.includes('mao') || key.includes('obra')) return HardHat;
  if (key.includes('equip')) return Wrench;
  if (key.includes('transp')) return Truck;
  return Receipt;
}

export function CustoListItem({
  custo,
  onOpen,
}: {
  custo: ObraCusto;
  onOpen: () => void;
}) {
  const Icon = categoryIcon(custo.category);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-lg border border-border p-4 text-left transition hover:border-brand/40 hover:bg-muted/30"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon size={20} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-ink">{custo.categoryLabel ?? custo.category}</p>
              {custo.purchaseOrderId && (
                <Badge status="PENDENTE" label="Via O.C." />
              )}
              <span className="text-xs text-ink-muted">{formatDate(custo.date)}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{custo.description}</p>
          </div>
          <p className="shrink-0 text-right text-base font-semibold tabular-nums text-ink">
            {formatCurrency(custo.amount)}
          </p>
        </div>
        <p className="mt-2 text-xs text-brand">Ver detalhes →</p>
      </div>
    </button>
  );
}
