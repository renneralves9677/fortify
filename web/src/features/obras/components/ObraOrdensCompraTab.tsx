import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Clock, Wallet } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import {
  OrdemCompraDetailModal,
  OrdemCompraListItem,
} from '@features/obras/components/OrdemCompraDetailModal';
import type { ObraPurchaseOrder } from '@features/obras/types';
import { formatCurrency, statusLabels } from '@shared/lib/format';
import { ListLoadingOverlay } from '@shared/components/ui/ListLoadingOverlay';

type ObraOrdensCompraTabProps = {
  orders: ObraPurchaseOrder[];
  canEdit: boolean;
  loading?: boolean;
  onEmitir: () => void;
  onApprove: (order: ObraPurchaseOrder) => void;
  onReceive: (order: ObraPurchaseOrder) => void;
  approveLoading?: boolean;
  receiveLoading?: boolean;
};

export function ObraOrdensCompraTab({
  orders,
  canEdit,
  loading = false,
  onEmitir,
  onApprove,
  onReceive,
  approveLoading,
  receiveLoading,
}: ObraOrdensCompraTabProps) {
  const [selectedOrder, setSelectedOrder] = useState<ObraPurchaseOrder | null>(null);

  useEffect(() => {
    if (!selectedOrder) return;
    const updated = orders.find((o) => o.id === selectedOrder.id);
    if (updated) setSelectedOrder(updated);
  }, [orders, selectedOrder?.id]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [orders],
  );

  const summary = useMemo(() => {
    const totalEmitido = orders.reduce((s, o) => s + o.amount, 0);
    const totalRecebido = orders.reduce((s, o) => s + (o.receivedAmount ?? 0), 0);
    const pendenteRecebimento = orders.reduce((s, o) => {
      const pending = o.amount - (o.receivedAmount ?? 0);
      return s + Math.max(pending, 0);
    }, 0);
    const aguardandoAprovacao = orders.filter(
      (o) => o.status === 'EMITIDA' && o.requiresApproval,
    ).length;

    return { totalEmitido, totalRecebido, pendenteRecebimento, aguardandoAprovacao };
  }, [orders]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      map.set(o.status, (map.get(o.status) ?? 0) + 1);
    }
    return [...map.entries()];
  }, [orders]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Ordens</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{orders.length}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Valor emitido</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(summary.totalEmitido)}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Valor recebido</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(summary.totalRecebido)}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Pendente recebimento</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatCurrency(summary.pendenteRecebimento)}
          </p>
          {summary.aguardandoAprovacao > 0 && (
            <p className="mt-1 text-xs text-ink-muted">
              {summary.aguardandoAprovacao} aguardando aprovação
            </p>
          )}
        </Card>
      </div>

      {byStatus.length > 1 && (
        <Card className="py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Por status</p>
          <ul className="flex flex-wrap gap-2">
            {byStatus.map(([status, count]) => (
              <li
                key={status}
                className="rounded-full bg-muted px-3 py-1 text-sm text-ink"
              >
                {statusLabels[status] ?? status}: <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ListLoadingOverlay loading={loading}>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-ink-muted" aria-hidden />
            <div>
              <h3 className="font-medium text-ink">Ordens de compra</h3>
              <p className="text-sm text-ink-muted">
                {orders.length} ordem{orders.length === 1 ? '' : 'ens'} nesta obra
              </p>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" onClick={onEmitir}>
              Emitir nova O.C.
            </Button>
          )}
        </div>

        {!sortedOrders.length ? (
          <EmptyState
            title="Nenhuma ordem de compra"
            description="Emita ordens para registrar compras e pagamentos vinculados a esta obra."
            action={canEdit ? <Button onClick={onEmitir}>Emitir primeira O.C.</Button> : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {sortedOrders.map((order) => (
              <li key={order.id}>
                <OrdemCompraListItem order={order} onOpen={() => setSelectedOrder(order)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      </ListLoadingOverlay>

      {orders.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="flex items-center gap-3 py-3">
            <Clock size={18} className="shrink-0 text-ink-muted" aria-hidden />
            <p className="text-sm text-ink-muted">
              <strong className="text-ink">{summary.aguardandoAprovacao}</strong> aguardando aprovação
            </p>
          </Card>
          <Card className="flex items-center gap-3 py-3">
            <Wallet size={18} className="shrink-0 text-ink-muted" aria-hidden />
            <p className="text-sm text-ink-muted">
              <strong className="text-ink">{formatCurrency(summary.pendenteRecebimento)}</strong> a receber
            </p>
          </Card>
          <Card className="flex items-center gap-3 py-3">
            <CheckCircle2 size={18} className="shrink-0 text-ink-muted" aria-hidden />
            <p className="text-sm text-ink-muted">
              <strong className="text-ink">{formatCurrency(summary.totalRecebido)}</strong> já recebido
            </p>
          </Card>
        </div>
      )}

      <OrdemCompraDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        canEdit={canEdit}
        onApprove={(order) => {
          onApprove(order);
        }}
        onReceive={(order) => {
          onReceive(order);
        }}
        approveLoading={approveLoading}
        receiveLoading={receiveLoading}
      />
    </div>
  );
}
