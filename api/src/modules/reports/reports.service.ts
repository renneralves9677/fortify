import {
  paginatedResult,
  paginationBounds,
  type PaginatedResult,
} from '../../shared/pagination.js';
import { buildExport } from './report-export.js';
import {
  CONTRACT_REPORT_HEADERS,
  mapContractToReportRow,
  mapObraToReportRow,
  OBRA_REPORT_HEADERS,
  contractRowToCells,
  obraRowToCells,
  type ContractReportRow,
  type ObraReportRow,
} from './report-rows.js';
import {
  aggregateCategoryShares,
  aggregateContractsMonthly,
  aggregateObrasMonthly,
  filterContractsInDashboardPeriod,
  monthKeysFromRange,
} from '../../domain/reports/dashboard-aggregates.js';
import { getCategoryLabel } from '../../domain/obras/cost-categories.js';
import type { ObraCostCategory } from '@prisma/client';
import type { DashboardQuery, ReportExportQuery, ReportListQuery } from './reports.schema.js';
import { defaultDashboardRange } from './reports.schema.js';
import { ReportsRepository } from './reports.repository.js';

const ACTIVE_CONTRACT_STATUSES = ['ASSINADO', 'ATIVO', 'VENCENDO'] as const;

export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getDashboard(companyId: string, query: DashboardQuery = { months: 6 }) {
    const range =
      query.from || query.to
        ? { from: query.from, to: query.to }
        : defaultDashboardRange(query.months);

    const [
      [contractsByStatus, obrasAtivas, assinaturasPendentes, custoAggAll, activeContractsValueAgg],
      [contractsForPeriod, obrasInPeriod, custosInPeriod, purchaseOrders, budgetAgg],
      executive,
    ] = await Promise.all([
      this.reportsRepository.getDashboardMetrics(companyId),
      this.reportsRepository.getDashboardPeriodData(companyId, range),
      this.reportsRepository.getExecutiveMetrics(companyId),
    ]);

    const contractsInPeriod = filterContractsInDashboardPeriod(contractsForPeriod, range);

    const monthKeys = monthKeysFromRange(range, query.months);
    const contractsMonthly = aggregateContractsMonthly(contractsInPeriod, monthKeys);
    const obrasMonthly = aggregateObrasMonthly(custosInPeriod, obrasInPeriod, monthKeys);

    const categoryLabels = Object.fromEntries(
      [...new Set(custosInPeriod.map((c) => c.category))].map((cat) => [
        cat,
        getCategoryLabel(cat as ObraCostCategory),
      ]),
    ) as Record<string, string>;
    const byCategory = aggregateCategoryShares(custosInPeriod, categoryLabels);

    const custoRealizadoPeriodo = custosInPeriod.reduce((s, c) => s + Number(c.amount), 0);
    const comprometido = purchaseOrders.reduce((sum, order) => {
      const pending = Number(order.amount) - Number(order.receivedAmount ?? 0);
      return sum + Math.max(pending, 0);
    }, 0);
    const orcamentoPrevisto = Number(budgetAgg._sum.budgetPlanned ?? 0);
    const contratosAtivos = contractsByStatus
      .filter((c) => ACTIVE_CONTRACT_STATUSES.includes(c.status as (typeof ACTIVE_CONTRACT_STATUSES)[number]))
      .reduce((s, c) => s + c._count, 0);

    const [pendingApprovals, openOccurrences, pendingPurchaseOrders] = executive;

    return {
      period: { from: range.from ?? null, to: range.to ?? null },
      contracts: {
        ativos: contratosAtivos,
        assinaturasPendentes,
        totalValueActive: Number(activeContractsValueAgg._sum.value ?? 0),
        createdInPeriod: contractsInPeriod.length,
        totalValueInPeriod: contractsInPeriod.reduce((s, c) => s + Number(c.value), 0),
        byStatus: contractsByStatus.map((c) => ({ status: c.status, count: c._count })),
        monthly: contractsMonthly,
      },
      obras: {
        ativas: obrasAtivas,
        createdInPeriod: obrasInPeriod.length,
        custoRealizado: custoRealizadoPeriodo,
        custoTotal: Number(custoAggAll._sum.amount ?? 0),
        orcamentoPrevisto,
        comprometido,
        ocorrenciasAbertas: openOccurrences,
        ocPendentes: pendingPurchaseOrders,
        monthly: obrasMonthly,
        byCategory,
      },
      alerts: {
        pendingApprovals,
        contractsInWorkflow: executive[3],
      },
    };
  }

  async listContractsReport(
    companyId: string,
    query: ReportListQuery,
  ): Promise<PaginatedResult<ContractReportRow>> {
    const { page, pageSize, from, to } = query;
    const { skip, take } = paginationBounds(page, pageSize);
    const [contracts, total] = await this.reportsRepository.findContractsReport(
      companyId,
      { from, to },
      skip,
      take,
    );
    const items = contracts.map(mapContractToReportRow);
    return paginatedResult(items, total, page, pageSize);
  }

  async listObrasReport(
    companyId: string,
    query: ReportListQuery,
  ): Promise<PaginatedResult<ObraReportRow>> {
    const { page, pageSize, from, to } = query;
    const { skip, take } = paginationBounds(page, pageSize);
    const [obras, total] = await this.reportsRepository.findObrasReport(
      companyId,
      { from, to },
      skip,
      take,
    );
    const items = obras.map(mapObraToReportRow);
    return paginatedResult(items, total, page, pageSize);
  }

  async exportContracts(companyId: string, query: ReportExportQuery) {
    const contracts = await this.reportsRepository.findContractsForExport(companyId, {
      from: query.from,
      to: query.to,
    });
    const rows = contracts.map(mapContractToReportRow).map(contractRowToCells);
    return buildExport({
      format: query.format,
      filenameBase: 'contratos',
      headers: CONTRACT_REPORT_HEADERS,
      rows,
    });
  }

  async exportObras(companyId: string, query: ReportExportQuery) {
    const obras = await this.reportsRepository.findObrasForExport(companyId, {
      from: query.from,
      to: query.to,
    });
    const rows = obras.map(mapObraToReportRow).map(obraRowToCells);
    return buildExport({
      format: query.format,
      filenameBase: 'obras',
      headers: OBRA_REPORT_HEADERS,
      rows,
    });
  }

  async getExecutiveDashboard(companyId: string) {
    const [pendingApprovals, openOccurrences, pendingPurchaseOrders, contractsInWorkflow] =
      await this.reportsRepository.getExecutiveMetrics(companyId);

    return {
      pendingApprovals,
      openOccurrences,
      pendingPurchaseOrders,
      contractsInWorkflow,
    };
  }
}
