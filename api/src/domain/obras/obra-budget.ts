type PurchaseOrderRow = {
  amount: number;
  receivedAmount: number;
  status: string;
};

const COMMITTED_PO_STATUSES = new Set(['APROVADA', 'RECEBIDA_PARCIAL']);

export function computeCommittedFromOrders(orders: PurchaseOrderRow[]): number {
  return orders.reduce((sum, order) => {
    if (!COMMITTED_PO_STATUSES.has(order.status)) return sum;
    const pending = order.amount - order.receivedAmount;
    return sum + Math.max(pending, 0);
  }, 0);
}

export function computeBudgetSummary(input: {
  budgetPlanned: number;
  budgetRealized: number;
  purchaseOrders: PurchaseOrderRow[];
}) {
  const planned = input.budgetPlanned ?? 0;
  const realized = input.budgetRealized ?? 0;
  const committed = computeCommittedFromOrders(input.purchaseOrders);
  const projected = realized + committed;
  const available = planned > 0 ? planned - projected : 0;

  return { planned, realized, committed, projected, available };
}
