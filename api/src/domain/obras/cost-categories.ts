import { ObraCostCategory } from '@prisma/client';

export type CostCategoryMeta = {
  label: string;
  requiresPurchaseOrder: boolean;
};

export const COST_CATEGORY_META: Record<ObraCostCategory, CostCategoryMeta> = {
  COMPRA_MATERIAL: { label: 'Compra de material', requiresPurchaseOrder: true },
  CONTRATACAO_SERVICO: { label: 'Contratação de serviço', requiresPurchaseOrder: true },
  EQUIPAMENTO: { label: 'Equipamento', requiresPurchaseOrder: true },
  COMBUSTIVEL: { label: 'Combustível', requiresPurchaseOrder: false },
  PEDAGIO: { label: 'Pedágio', requiresPurchaseOrder: false },
  DESPESA_ADMINISTRATIVA: { label: 'Despesas administrativas', requiresPurchaseOrder: false },
  REEMBOLSO_FUNCIONARIO: { label: 'Reembolso de funcionário', requiresPurchaseOrder: false },
};

export function getCategoryLabel(category: ObraCostCategory): string {
  return COST_CATEGORY_META[category]?.label ?? category;
}

export function isDirectCostAllowed(category: ObraCostCategory): boolean {
  return !COST_CATEGORY_META[category].requiresPurchaseOrder;
}

export function isPurchaseOrderCategory(category: ObraCostCategory): boolean {
  return COST_CATEGORY_META[category].requiresPurchaseOrder;
}

export function getPoApprovalThreshold(): number {
  const raw = process.env.PO_APPROVAL_THRESHOLD;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 5000;
}

export function requiresPoApproval(amount: number): boolean {
  return amount >= getPoApprovalThreshold();
}

export function isAdminRole(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function listCostCategoriesForApi() {
  return Object.entries(COST_CATEGORY_META).map(([code, meta]) => ({
    code: code as ObraCostCategory,
    label: meta.label,
    requiresPurchaseOrder: meta.requiresPurchaseOrder,
  }));
}
