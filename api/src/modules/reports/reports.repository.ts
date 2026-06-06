import { prisma } from '../../core/database/prisma.js';
import type { ReportDateRange } from './reports.schema.js';
import { createdAtRangeFilter } from './reports.schema.js';

function contractWhere(companyId: string, range: ReportDateRange) {
  const createdAt = createdAtRangeFilter(range);
  return {
    companyId,
    ...(createdAt ? { createdAt } : {}),
  };
}

function obraWhere(companyId: string, range: ReportDateRange) {
  const createdAt = createdAtRangeFilter(range);
  return {
    companyId,
    ...(createdAt ? { createdAt } : {}),
  };
}

const contractReportSelect = {
  id: true,
  title: true,
  partyName: true,
  status: true,
  value: true,
  startDate: true,
  endDate: true,
  createdAt: true,
} as const;

const obraReportSelect = {
  id: true,
  name: true,
  status: true,
  budgetPlanned: true,
  createdAt: true,
} as const;

export class ReportsRepository {
  getDashboardMetrics(companyId: string) {
    return Promise.all([
      prisma.contract.groupBy({ by: ['status'], where: { companyId }, _count: true }),
      prisma.obra.count({ where: { companyId, status: 'ativa' } }),
      prisma.signatureRequest.count({
        where: { status: 'PENDENTE', contract: { companyId } },
      }),
      prisma.obraCusto.aggregate({
        where: { obra: { companyId } },
        _sum: { amount: true },
      }),
    ]);
  }

  getDashboardPeriodData(companyId: string, range: ReportDateRange) {
    const createdAt = createdAtRangeFilter(range);
    const custoDate = createdAtRangeFilter(range);
    const contractPeriodWhere = {
      companyId,
      ...(createdAt ? { createdAt } : {}),
    };
    const custoWhere = {
      obra: { companyId },
      ...(custoDate ? { date: custoDate } : {}),
    };
    const obraPeriodWhere = {
      companyId,
      ...(createdAt ? { createdAt } : {}),
    };

    return Promise.all([
      prisma.contract.findMany({
        where: contractPeriodWhere,
        select: { createdAt: true, value: true, status: true },
      }),
      prisma.obra.findMany({
        where: obraPeriodWhere,
        select: { createdAt: true, budgetPlanned: true },
      }),
      prisma.obraCusto.findMany({
        where: custoWhere,
        select: { date: true, amount: true, category: true },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          companyId,
          status: { in: ['APROVADA', 'RECEBIDA_PARCIAL'] },
        },
        select: { amount: true, receivedAmount: true, status: true },
      }),
      prisma.obra.aggregate({
        where: { companyId, status: 'ativa' },
        _sum: { budgetPlanned: true },
      }),
    ]);
  }

  findContractsReport(
    companyId: string,
    range: ReportDateRange,
    skip: number,
    take: number,
  ) {
    const where = contractWhere(companyId, range);
    return Promise.all([
      prisma.contract.findMany({
        where,
        select: contractReportSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.contract.count({ where }),
    ]);
  }

  findObrasReport(companyId: string, range: ReportDateRange, skip: number, take: number) {
    const where = obraWhere(companyId, range);
    return Promise.all([
      prisma.obra.findMany({
        where,
        select: obraReportSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.obra.count({ where }),
    ]);
  }

  findContractsForExport(companyId: string, range: ReportDateRange = {}) {
    return prisma.contract.findMany({
      where: contractWhere(companyId, range),
      select: contractReportSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  findObrasForExport(companyId: string, range: ReportDateRange = {}) {
    return prisma.obra.findMany({
      where: obraWhere(companyId, range),
      select: obraReportSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  getExecutiveMetrics(companyId: string) {
    return Promise.all([
      prisma.contractApproval.count({
        where: { status: 'PENDING', contract: { companyId } },
      }),
      prisma.obraOccurrence.count({
        where: { resolved: false, obra: { companyId } },
      }),
      prisma.purchaseOrder.count({
        where: { companyId, status: { in: ['EMITIDA', 'APROVADA'] } },
      }),
      prisma.contract.count({
        where: { companyId, status: { in: ['REVISAO', 'APROVACAO', 'ENVIO'] } },
      }),
    ]);
  }
}
