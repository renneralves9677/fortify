import { Building2, Calendar, ClipboardList, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/Button';
import { Badge } from '@shared/components/ui/Badge';
import { RecordCreatorSection } from '@features/obras/components/RecordCreatorSection';
import type { ObraPurchaseOrder } from '@features/obras/types';
import { formatCnpj } from '@shared/lib/br-format';
import { formatCurrency, formatDate, formatDateTime, statusLabels } from '@shared/lib/format';
import { cn } from '@shared/lib/cn';

type OrdemCompraDetailModalProps = {
  order: ObraPurchaseOrder | null;
  open: boolean;
  onClose: () => void;
  canEdit?: boolean;
  onApprove?: (order: ObraPurchaseOrder) => void;
  onReceive?: (order: ObraPurchaseOrder) => void;
  approveLoading?: boolean;
  receiveLoading?: boolean;
};

export function OrdemCompraDetailModal({
  order,
  open,
  onClose,
  canEdit,
  onApprove,
  onReceive,
  approveLoading,
  receiveLoading,
}: OrdemCompraDetailModalProps) {
  if (!order) return null;

  const received = order.receivedAmount ?? 0;
  const pending = Math.max(order.amount - received, 0);
  const receivePct = order.amount > 0 ? Math.min((received / order.amount) * 100, 100) : 0;
  const statusLabel = statusLabels[order.status] ?? order.status;

  const canApprove =
    canEdit && order.status === 'EMITIDA' && order.requiresApproval && onApprove;
  const canReceive =
    canEdit &&
    (order.status === 'APROVADA' || order.status === 'RECEBIDA_PARCIAL') &&
    pending > 0 &&
    onReceive;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{order.number}</DialogTitle>
            <Badge status={order.status} label={statusLabel} />
            {order.categoryLabel && (
              <Badge status="ATIVO" label={order.categoryLabel} />
            )}
            {order.status === 'EMITIDA' && order.requiresApproval && (
              <Badge status="PENDENTE" label="Aguarda aprovação" />
            )}
            {order.status === 'APROVADA' && !order.requiresApproval && order.approvedAt && (
              <Badge status="ATIVO" label="Aprovada automaticamente" />
            )}
          </div>
          <DialogDescription>
            {order.createdAt
              ? `Emitida em ${formatDateTime(order.createdAt)}`
              : 'Ordem de compra da obra'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RecordCreatorSection creator={order.createdBy} label="Emitida por" />

          <div className="rounded-control border border-border bg-surface-sunken/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Valor da ordem</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {formatCurrency(order.amount)}
            </p>
            {received > 0 && (
              <p className="mt-1 text-sm text-ink-muted">
                Recebido: {formatCurrency(received)}
                {pending > 0 ? ` · Pendente: ${formatCurrency(pending)}` : ' · Quitada'}
              </p>
            )}
          </div>

          {(received > 0 || order.status === 'APROVADA' || order.status === 'RECEBIDA_PARCIAL') && (
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-ink-muted">Progresso de recebimento</span>
                <span className="font-medium tabular-nums">{receivePct.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full bg-brand transition-all',
                    receivePct >= 100 && 'bg-success',
                  )}
                  style={{ width: `${receivePct}%` }}
                />
              </div>
            </div>
          )}

          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Building2 size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">CNPJ pagador</dt>
                <dd className="mt-0.5 font-medium text-ink">{formatCnpj(order.payerCnpj)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Descrição / itens</dt>
                <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed text-ink">
                  {order.description}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardList size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Status</dt>
                <dd className="mt-0.5 text-ink">{statusLabel}</dd>
              </div>
            </div>
            {order.createdAt && (
              <div className="flex items-start gap-3">
                <Calendar size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Data de emissão</dt>
                  <dd className="mt-0.5 text-ink">{formatDate(order.createdAt)}</dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        {(canApprove || canReceive) && (
          <DialogFooter className="gap-2 sm:gap-0">
            {canApprove && (
              <Button loading={approveLoading} onClick={() => onApprove(order)}>
                Aprovar ordem
              </Button>
            )}
            {canReceive && (
              <Button
                variant="secondary"
                loading={receiveLoading}
                onClick={() => onReceive(order)}
              >
                Registrar recebimento ({formatCurrency(pending)})
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OrdemCompraListItem({
  order,
  onOpen,
}: {
  order: ObraPurchaseOrder;
  onOpen: () => void;
}) {
  const received = order.receivedAmount ?? 0;
  const pending = Math.max(order.amount - received, 0);
  const statusLabel = statusLabels[order.status] ?? order.status;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-lg border border-border p-4 text-left transition hover:border-brand/40 hover:bg-muted/30"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <ClipboardList size={20} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-ink">{order.number}</p>
              <Badge status={order.status} label={statusLabel} />
              {order.categoryLabel && (
                <span className="text-xs text-ink-muted">{order.categoryLabel}</span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{order.description}</p>
            <p className="mt-1 text-xs text-ink-muted">CNPJ {formatCnpj(order.payerCnpj)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-semibold tabular-nums text-ink">
              {formatCurrency(order.amount)}
            </p>
            {received > 0 && (
              <p className="text-xs text-ink-muted">
                Recebido {formatCurrency(received)}
                {pending > 0 ? ` · Falta ${formatCurrency(pending)}` : ''}
              </p>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-brand">Ver detalhes →</p>
      </div>
    </button>
  );
}
