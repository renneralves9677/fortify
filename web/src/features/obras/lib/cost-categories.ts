import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';

export type ObraCostCategoryCode =
  | 'COMPRA_MATERIAL'
  | 'CONTRATACAO_SERVICO'
  | 'EQUIPAMENTO'
  | 'COMBUSTIVEL'
  | 'PEDAGIO'
  | 'DESPESA_ADMINISTRATIVA'
  | 'REEMBOLSO_FUNCIONARIO';

export type CostCategoryItem = {
  code: ObraCostCategoryCode;
  label: string;
  requiresPurchaseOrder: boolean;
};

export type CostCategoriesResponse = {
  categories: CostCategoryItem[];
  poApprovalThreshold: number;
};

export function useCostCategories() {
  return useQuery({
    queryKey: ['obra-cost-categories'],
    queryFn: async () => (await api.get<CostCategoriesResponse>('/obras/cost-categories')).data,
    staleTime: 5 * 60 * 1000,
  });
}

export function directCostCategories(categories: CostCategoryItem[] | undefined) {
  return (categories ?? []).filter((c) => !c.requiresPurchaseOrder);
}

export function purchaseOrderCategories(categories: CostCategoryItem[] | undefined) {
  return (categories ?? []).filter((c) => c.requiresPurchaseOrder);
}
