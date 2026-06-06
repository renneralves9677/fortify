export type DashboardMonthlyContracts = {
  month: string;
  label: string;
  count: number;
  value: number;
};

export type DashboardMonthlyObras = {
  month: string;
  label: string;
  custos: number;
  obras: number;
};

export type DashboardCategoryShare = {
  label: string;
  amount: number;
  sharePct: number;
};

export type DashboardData = {
  period: { from: string | null; to: string | null };
  contracts: {
    ativos: number;
    assinaturasPendentes: number;
    totalValueActive: number;
    createdInPeriod: number;
    totalValueInPeriod: number;
    byStatus: { status: string; count: number }[];
    monthly: DashboardMonthlyContracts[];
  };
  obras: {
    ativas: number;
    createdInPeriod: number;
    custoRealizado: number;
    custoTotal: number;
    orcamentoPrevisto: number;
    comprometido: number;
    ocorrenciasAbertas: number;
    ocPendentes: number;
    monthly: DashboardMonthlyObras[];
    byCategory: DashboardCategoryShare[];
  };
  alerts: {
    pendingApprovals: number;
    contractsInWorkflow: number;
  };
};
