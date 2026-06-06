import { prisma } from '../../core/database/prisma.js';
import type { Prisma } from '@prisma/client';
import type { ObrasRepositoryPort } from './obras.repository.port.js';

export const DEFAULT_OBRA_STEPS = [
  { title: 'Briefing e escopo', sortOrder: 1 },
  { title: 'Orçamento baseline', sortOrder: 2 },
  { title: 'Vistoria inicial', sortOrder: 3 },
  { title: 'Mobilização', sortOrder: 4 },
  { title: 'Execução principal', sortOrder: 5 },
  { title: 'Controle de custos', sortOrder: 6 },
  { title: 'Vistoria final', sortOrder: 7 },
  { title: 'Termo de conclusão', sortOrder: 8 },
];

export class ObrasRepository implements ObrasRepositoryPort {
  findManyByCompany(companyId: string) {
    return prisma.obra.findMany({
      where: { companyId },
      include: {
        contract: { select: { id: true, title: true } },
        _count: { select: { custos: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findEligibleContracts(companyId: string) {
    return prisma.contract.findMany({
      where: {
        companyId,
        status: { in: ['ASSINADO', 'ATIVO'] },
        obras: { none: {} },
      },
      select: { id: true, title: true, partyName: true, status: true },
      orderBy: { title: 'asc' },
    });
  }

  findContractByIdForCompany(contractId: string, companyId: string) {
    return prisma.contract.findFirst({
      where: { id: contractId, companyId },
      select: { id: true, status: true, title: true, partyName: true },
    });
  }

  findObraByContractId(contractId: string, companyId: string) {
    return prisma.obra.findFirst({
      where: { contractId, companyId },
      select: { id: true, name: true },
    });
  }

  create(data: Prisma.ObraCreateInput) {
    return prisma.obra.create({
      data,
      include: { steps: true },
    });
  }

  findByIdForCompany(id: string, companyId: string) {
    return prisma.obra.findFirst({
      where: { id, companyId },
      include: {
        contract: true,
        steps: { orderBy: { sortOrder: 'asc' } },
        vistorias: {
          orderBy: { createdAt: 'desc' },
          include: { obraStep: { select: { id: true, title: true } } },
        },
        custos: {
          orderBy: { date: 'desc' },
          include: { obraStep: { select: { id: true, title: true } } },
        },
        purchaseOrders: {
          include: { obraStep: { select: { id: true, title: true } } },
        },
        occurrences: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  findStepForObra(stepId: string, obraId: string, companyId: string) {
    return prisma.obraStep.findFirst({
      where: { id: stepId, obraId, obra: { companyId } },
    });
  }

  findStepsForObra(obraId: string, companyId: string) {
    return prisma.obraStep.findMany({
      where: { obraId, obra: { companyId } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  getMaxStepSortOrder(obraId: string) {
    return prisma.obraStep.aggregate({
      where: { obraId },
      _max: { sortOrder: true },
    });
  }

  createStep(obraId: string, data: { title: string; description?: string | null; sortOrder: number }) {
    return prisma.obraStep.create({
      data: { obraId, title: data.title, description: data.description ?? null, sortOrder: data.sortOrder },
    });
  }

  updateStepForObra(
    stepId: string,
    obraId: string,
    companyId: string,
    data: { done?: boolean; title?: string; description?: string | null },
  ) {
    return prisma.obraStep.updateMany({
      where: { id: stepId, obra: { id: obraId, companyId } },
      data,
    });
  }

  deleteStepForObra(stepId: string, obraId: string, companyId: string) {
    return prisma.obraStep.deleteMany({
      where: { id: stepId, obra: { id: obraId, companyId } },
    });
  }

  reorderSteps(obraId: string, companyId: string, stepIds: string[]) {
    return prisma.$transaction(
      stepIds.map((id, index) =>
        prisma.obraStep.updateMany({
          where: { id, obraId, obra: { companyId } },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
  }

  findAuditLogsForObra(obraId: string, companyId: string) {
    return prisma.auditLog.findMany({
      where: { companyId, entityType: 'Obra', entityId: obraId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findUsersByIds(userIds: string[], companyId: string) {
    if (!userIds.length) return Promise.resolve([]);
    return prisma.user.findMany({
      where: { id: { in: userIds }, companyId },
      select: { id: true, name: true, email: true },
    });
  }

  createVistoria(
    obraId: string,
    data: Omit<Prisma.ObraVistoriaUncheckedCreateInput, 'obraId'>,
  ) {
    return prisma.obraVistoria.create({ data: { obraId, ...data } });
  }

  createCusto(obraId: string, data: Omit<Prisma.ObraCustoUncheckedCreateInput, 'obraId'>) {
    return prisma.obraCusto.create({ data: { obraId, ...data } });
  }

  createOccurrence(obraId: string, data: Prisma.ObraOccurrenceCreateWithoutObraInput) {
    return prisma.obraOccurrence.create({ data: { obraId, ...data } });
  }

  resolveOccurrence(id: string, obraId: string, companyId: string) {
    return prisma.obraOccurrence.updateMany({
      where: { id, obraId, obra: { companyId } },
      data: { resolved: true },
    });
  }

  createNonConformity(data: Prisma.ObraNonConformityCreateInput) {
    return prisma.obraNonConformity.create({ data });
  }

  findVistoriaForObra(vistoriaId: string, obraId: string, companyId: string) {
    return prisma.obraVistoria.findFirst({
      where: { id: vistoriaId, obraId, obra: { companyId } },
    });
  }

  closeObra(id: string, companyId: string) {
    return prisma.obra.updateMany({
      where: { id, companyId, status: { not: 'encerrada' } },
      data: { status: 'encerrada' },
    });
  }

  updateBudgetForCompany(id: string, companyId: string, budgetPlanned: number) {
    return prisma.obra.updateMany({
      where: { id, companyId, status: { not: 'encerrada' } },
      data: { budgetPlanned },
    });
  }
}
