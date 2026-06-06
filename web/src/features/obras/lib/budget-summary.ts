import type { ObraCusto, ObraPurchaseOrder } from '@features/obras/types';

export type BudgetStatus = 'none' | 'ok' | 'warning' | 'over';

export type BudgetCategoryRow = {
  label: string;
  amount: number;
  sharePct: number;
};

export type BudgetMonthRow = {
  month: string;
  label: string;
  amount: number;
};

export type BudgetSummary = {
  planned: number;
  realized: number;
  committed: number;
  projected: number;
  available: number;
  usagePct: number | null;
  projectedPct: number | null;
  projectedPctGauge: number;
  status: BudgetStatus;
  byCategory: BudgetCategoryRow[];
  byMonth: BudgetMonthRow[];
};

const COMMITTED_PO_STATUSES = new Set(['APROVADA', 'RECEBIDA_PARCIAL']);

export function computeCommittedFromOrders(orders: ObraPurchaseOrder[]): number {
  return orders.reduce((sum, order) => {
    if (!COMMITTED_PO_STATUSES.has(order.status)) return sum;
    const pending = order.amount - (order.receivedAmount ?? 0);
    return sum + Math.max(pending, 0);
  }, 0);
}

function resolveBudgetStatus(planned: number, projectedPct: number | null): BudgetStatus {
  if (planned <= 0) return 'none';
  if (projectedPct == null) return 'none';
  if (projectedPct > 100) return 'over';
  if (projectedPct >= 80) return 'warning';
  return 'ok';
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date);
}

function buildByCategory(custos: ObraCusto[]): BudgetCategoryRow[] {
  const map = new Map<string, number>();
  for (const c of custos) {
    const label = c.categoryLabel ?? c.category;
    map.set(label, (map.get(label) ?? 0) + c.amount);
  }
  const realized = custos.reduce((s, c) => s + c.amount, 0);
  return [...map.entries()]
    .map(([label, amount]) => ({
      label,
      amount,
      sharePct: realized > 0 ? (amount / realized) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildByMonth(custos: ObraCusto[]): BudgetMonthRow[] {
  const map = new Map<string, number>();
  for (const c of custos) {
    const d = new Date(c.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + c.amount);
  }
  return [...map.entries()]
    .map(([month, amount]) => ({
      month,
      label: formatMonthLabel(month),
      amount,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);
}

export function computeBudgetSummary(input: {
  budgetPlanned: number;
  budgetRealized: number;
  purchaseOrders?: ObraPurchaseOrder[];
  custos?: ObraCusto[];
}): BudgetSummary {
  const planned = input.budgetPlanned ?? 0;
  const realized = input.budgetRealized ?? 0;
  const committed = computeCommittedFromOrders(input.purchaseOrders ?? []);
  const projected = realized + committed;
  const available = planned > 0 ? planned - projected : 0;

  const usagePct = planned > 0 ? (realized / planned) * 100 : null;
  const projectedPct = planned > 0 ? (projected / planned) * 100 : null;
  const projectedPctGauge =
    projectedPct == null ? 0 : Math.min(projectedPct, 100);

  return {
    planned,
    realized,
    committed,
    projected,
    available,
    usagePct,
    projectedPct,
    projectedPctGauge,
    status: resolveBudgetStatus(planned, projectedPct),
    byCategory: buildByCategory(input.custos ?? []),
    byMonth: buildByMonth(input.custos ?? []),
  };
}

export function getBudgetStatusLabel(status: BudgetStatus): string {
  switch (status) {
    case 'ok':
      return 'Dentro do orçamento';
    case 'warning':
      return 'Quase no limite';
    case 'over':
      return 'Acima do orçamento';
    default:
      return 'Sem orçamento definido';
  }
}
