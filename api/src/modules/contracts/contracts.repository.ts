import { ContractStatus, SignatureFlowStatus, type Contract, type ContractType } from '@prisma/client';
import { prisma } from '../../core/database/prisma.js';
import type { Prisma } from '@prisma/client';
import { buildContractStatusFilter } from './contracts-status-filter.js';
import type { ContractsRepositoryPort } from './contracts.repository.port.js';

export type ContractListFilters = {
  status?: ContractStatus;
  type?: ContractType;
  search?: string;
  title?: string;
  partyName?: string;
  periodFrom?: string;
  periodTo?: string;
  managerOnly?: boolean;
};

export type ContractWithRelations = Contract & {
  template?: {
    bodyHtml: string;
    fields?: Array<{
      key: string;
      label: string;
      fieldType: string;
      required: boolean;
      sortOrder: number;
    }>;
  } | null;
  signatureRequests?: unknown[];
};

export class ContractsRepository implements ContractsRepositoryPort {
  private buildPeriodOverlapFilter(
    periodFrom?: string,
    periodTo?: string,
  ): Prisma.ContractWhereInput | undefined {
    if (!periodFrom && !periodTo) return undefined;

    const fromDate = periodFrom ? new Date(`${periodFrom}T00:00:00.000Z`) : undefined;
    const toDate = periodTo ? new Date(`${periodTo}T23:59:59.999Z`) : undefined;

    const conditions: Prisma.ContractWhereInput[] = [];
    if (toDate) {
      conditions.push({ OR: [{ startDate: null }, { startDate: { lte: toDate } }] });
    }
    if (fromDate) {
      conditions.push({ OR: [{ endDate: null }, { endDate: { gte: fromDate } }] });
    }
    return conditions.length ? { AND: conditions } : undefined;
  }

  private contractListWhere(companyId: string, filters: ContractListFilters): Prisma.ContractWhereInput {
    const { status, type, search, title, partyName, periodFrom, periodTo, managerOnly } = filters;
    const periodFilter = this.buildPeriodOverlapFilter(periodFrom, periodTo);

    return {
      companyId,
      ...(managerOnly
        ? {
            status: {
              in: [
                ContractStatus.ASSINADO,
                ContractStatus.ATIVO,
                ContractStatus.VENCENDO,
                ContractStatus.ENCERRADO,
              ],
            },
          }
        : {}),
      ...(status ? buildContractStatusFilter(status) : {}),
      ...(type ? { type } : {}),
      ...(title?.trim() ? { title: { contains: title.trim(), mode: 'insensitive' } } : {}),
      ...(partyName?.trim()
        ? { partyName: { contains: partyName.trim(), mode: 'insensitive' } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { partyName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(periodFilter ?? {}),
    };
  }

  findManyForCompany(
    companyId: string,
    filters: ContractListFilters & { skip?: number; take?: number },
  ) {
    const where = this.contractListWhere(companyId, filters);
    return prisma.contract.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      ...(filters.skip !== undefined ? { skip: filters.skip } : {}),
      ...(filters.take !== undefined ? { take: filters.take } : {}),
    });
  }

  countManyForCompany(companyId: string, filters: ContractListFilters) {
    return prisma.contract.count({
      where: this.contractListWhere(companyId, filters),
    });
  }

  findManagerContracts(
    companyId: string,
    filters: { search?: string; skip?: number; take?: number } = {},
  ) {
    const where = this.contractListWhere(companyId, { ...filters, managerOnly: true });
    return prisma.contract.findMany({
      where,
      orderBy: { endDate: 'asc' },
      ...(filters.skip !== undefined ? { skip: filters.skip } : {}),
      ...(filters.take !== undefined ? { take: filters.take } : {}),
    });
  }

  findByIdForCompany(id: string, companyId: string) {
    return prisma.contract.findFirst({
      where: { id, companyId },
      include: {
        template: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
        signatureRequests: { orderBy: { sentAt: 'desc' } },
      },
    });
  }

  findTemplateByIdForCompany(templateId: string, companyId: string) {
    return prisma.contractTemplate.findFirst({
      where: { id: templateId, companyId },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  create(data: Prisma.ContractCreateInput) {
    return prisma.contract.create({ data });
  }

  update(id: string, data: Prisma.ContractUpdateInput) {
    return prisma.contract.update({ where: { id }, data });
  }

  closeByIdForCompany(id: string, companyId: string) {
    return prisma.contract.updateMany({
      where: { id, companyId },
      data: { status: ContractStatus.ENCERRADO },
    });
  }

  updateStatus(id: string, status: ContractStatus) {
    return prisma.contract.update({ where: { id }, data: { status } });
  }

  findVersions(contractId: string) {
    return prisma.contractVersion.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findVersionByNumber(contractId: string, versionNumber: string) {
    return prisma.contractVersion.findFirst({
      where: { contractId, versionNumber },
    });
  }

  countVersions(contractId: string) {
    return prisma.contractVersion.count({ where: { contractId } });
  }

  createVersion(data: Prisma.ContractVersionCreateInput) {
    return prisma.contractVersion.create({ data });
  }

  findDisplayFlowForContract(contractId: string) {
    return prisma.contractSignatureFlow.findFirst({
      where: { contractId, status: SignatureFlowStatus.IN_PROGRESS },
      include: { signers: true },
    });
  }

  findLatestCompletedFlowForContract(contractId: string) {
    return prisma.contractSignatureFlow.findFirst({
      where: { contractId, status: SignatureFlowStatus.COMPLETED },
      include: { signers: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findInProgressFlowForContract(contractId: string) {
    return prisma.contractSignatureFlow.findFirst({
      where: { contractId, status: SignatureFlowStatus.IN_PROGRESS },
    });
  }
}
