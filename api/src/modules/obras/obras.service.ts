import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { logAudit } from '../../middleware/audit.js';
import type {
  CreateNonConformityInput,
  CreateCustoInput,
  CreateObraInput,
  CreateOccurrenceInput,
  CreateStepInput,
  CreateVistoriaInput,
  ObraReportQuery,
  ReorderStepsInput,
  UpdateObraBudgetInput,
  UpdateStepInput,
} from './obras.schema.js';
import { DEFAULT_OBRA_STEPS } from './obras.repository.js';
import type { ObrasRepositoryPort } from './obras.repository.port.js';
import { ObraCloseService } from './obra-close.service.js';
import { ObraCustosService } from './obra-custos.service.js';
import { ObraStepsService } from './obra-steps.service.js';
import { ObraVistoriasService } from './obra-vistorias.service.js';
import {
  assertContractAvailableForObra,
  assertObraActive,
  getObraOrThrow,
  mapObraForReport,
  resolveLinkedContract,
  serializeObraListItem,
} from './obras-shared.js';
import {
  buildObraReportHtml,
  buildObraReportModel,
  wrapObraReportDocument,
} from '../../domain/obras/obra-report.js';
import { renderFullHtmlToPdf } from '../../domain/signatures/html-to-pdf.js';
import {
  getCategoryLabel,
  getPoApprovalThreshold,
  requiresPoApproval,
} from '../../domain/obras/cost-categories.js';
import {
  buildRecordCreatorMaps,
  collectCreatorUserIds,
  pickCreator,
} from '../../domain/obras/record-creators.js';

export class ObrasService {
  private readonly steps: ObraStepsService;
  private readonly custos: ObraCustosService;
  private readonly vistorias: ObraVistoriasService;
  private readonly close: ObraCloseService;

  constructor(private readonly obrasRepository: ObrasRepositoryPort) {
    this.steps = new ObraStepsService(obrasRepository);
    this.custos = new ObraCustosService(obrasRepository);
    this.vistorias = new ObraVistoriasService(obrasRepository);
    this.close = new ObraCloseService(obrasRepository);
  }

  async listObras(companyId: string) {
    const obras = await this.obrasRepository.findManyByCompany(companyId);
    return obras.map(serializeObraListItem);
  }

  async listEligibleContracts(companyId: string) {
    return this.obrasRepository.findEligibleContracts(companyId);
  }

  listCostCategories() {
    return this.custos.listCostCategories();
  }

  async createObra(companyId: string, userId: string | undefined, input: CreateObraInput) {
    await assertContractAvailableForObra(this.obrasRepository, input.contractId, companyId);

    const obra = await withPrismaError(() =>
      this.obrasRepository.create({
        name: input.name,
        address: input.address,
        budgetPlanned: input.budgetPlanned,
        company: { connect: { id: companyId } },
        contract: { connect: { id: input.contractId } },
        steps: { create: DEFAULT_OBRA_STEPS },
      }),
    );

    await logAudit(companyId, userId, 'OBRA_CREATE', 'Obra', obra.id, {
      name: obra.name,
    });

    return { ...obra, budgetPlanned: Number(obra.budgetPlanned) };
  }

  private async resolveRecordCreators(obraId: string, companyId: string) {
    const logs = await this.obrasRepository.findAuditLogsForObra(obraId, companyId);
    const maps = buildRecordCreatorMaps(logs);
    const users = await this.obrasRepository.findUsersByIds(
      collectCreatorUserIds(maps),
      companyId,
    );
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      forVistoria: (vistoriaId: string) =>
        pickCreator(userMap, maps.vistoriaUsers.get(vistoriaId)),
      forCusto: (custoId: string) => pickCreator(userMap, maps.custoUsers.get(custoId)),
      forOrder: (orderId: string) => pickCreator(userMap, maps.orderUsers.get(orderId)),
    };
  }

  async getObraById(id: string, companyId: string) {
    const obra = await getObraOrThrow(this.obrasRepository, id, companyId);
    const custoRealizado = obra.custos.reduce((s, c) => s + Number(c.amount), 0);
    const contract = await resolveLinkedContract(this.obrasRepository, obra, companyId);
    const creators = await this.resolveRecordCreators(id, companyId);

    return {
      ...obra,
      contract,
      contractId: obra.contractId,
      budgetPlanned: Number(obra.budgetPlanned),
      budgetRealized: custoRealizado,
      vistorias: obra.vistorias.map((v) => ({
        ...v,
        stepTitle: v.obraStep?.title ?? null,
        createdBy: creators.forVistoria(v.id),
      })),
      custos: obra.custos.map((c) => ({
        ...c,
        amount: Number(c.amount),
        categoryLabel: getCategoryLabel(c.category),
        stepTitle: c.obraStep?.title ?? null,
        createdBy: creators.forCusto(c.id),
      })),
      purchaseOrders: obra.purchaseOrders.map((p) => {
        const amount = Number(p.amount);
        return {
          ...p,
          amount,
          receivedAmount: Number(p.receivedAmount),
          categoryLabel: getCategoryLabel(p.category),
          requiresApproval: requiresPoApproval(amount),
          poApprovalThreshold: getPoApprovalThreshold(),
          stepTitle: p.obraStep?.title ?? null,
          createdBy: creators.forOrder(p.id),
        };
      }),
    };
  }

  async updateObraBudget(
    id: string,
    companyId: string,
    userId: string | undefined,
    input: UpdateObraBudgetInput,
  ) {
    const obra = await getObraOrThrow(this.obrasRepository, id, companyId);
    assertObraActive(obra);

    const result = await this.obrasRepository.updateBudgetForCompany(
      id,
      companyId,
      input.budgetPlanned,
    );
    if (!result.count) {
      throw new AppError(400, 'Obra encerrada — operação não permitida', 'OBRA_CLOSED');
    }

    await logAudit(companyId, userId, 'OBRA_BUDGET_UPDATE', 'Obra', id, {
      budgetPlanned: input.budgetPlanned,
      previousBudgetPlanned: Number(obra.budgetPlanned),
    });

    return this.getObraById(id, companyId);
  }

  getCloseReadiness(id: string, companyId: string) {
    return this.close.getCloseReadiness(id, companyId);
  }

  closeObra(id: string, companyId: string, userId: string | undefined) {
    return this.close.closeObra(id, companyId, userId);
  }

  createStep(obraId: string, companyId: string, userId: string | undefined, input: CreateStepInput) {
    return this.steps.createStep(obraId, companyId, userId, input);
  }

  updateStep(
    obraId: string,
    stepId: string,
    companyId: string,
    userId: string | undefined,
    input: UpdateStepInput,
  ) {
    return this.steps.updateStep(obraId, stepId, companyId, userId, input);
  }

  reorderSteps(
    obraId: string,
    companyId: string,
    userId: string | undefined,
    input: ReorderStepsInput,
  ) {
    return this.steps.reorderSteps(obraId, companyId, userId, input);
  }

  deleteStep(obraId: string, stepId: string, companyId: string, userId: string | undefined) {
    return this.steps.deleteStep(obraId, stepId, companyId, userId);
  }

  addVistoria(
    obraId: string,
    companyId: string,
    userId: string | undefined,
    input: CreateVistoriaInput,
  ) {
    return this.vistorias.addVistoria(obraId, companyId, userId, input);
  }

  addCusto(obraId: string, companyId: string, userId: string | undefined, input: CreateCustoInput) {
    return this.custos.addCusto(obraId, companyId, userId, input);
  }

  async addOccurrence(
    obraId: string,
    companyId: string,
    userId: string | undefined,
    input: CreateOccurrenceInput,
  ) {
    const obra = await getObraOrThrow(this.obrasRepository, obraId, companyId);
    assertObraActive(obra);

    const occurrence = await this.obrasRepository.createOccurrence(obra.id, input);

    await logAudit(companyId, userId, 'OBRA_OCCURRENCE_CREATE', 'Obra', obraId, {
      occurrenceId: occurrence.id,
      title: occurrence.title,
      severity: occurrence.severity,
    });

    return occurrence;
  }

  async resolveOccurrence(
    obraId: string,
    occurrenceId: string,
    companyId: string,
    userId: string | undefined,
  ) {
    const obra = await getObraOrThrow(this.obrasRepository, obraId, companyId);
    assertObraActive(obra);

    const result = await this.obrasRepository.resolveOccurrence(occurrenceId, obraId, companyId);
    if (!result.count) {
      throw new AppError(404, 'Ocorrência não encontrada', 'OCCURRENCE_NOT_FOUND');
    }

    await logAudit(companyId, userId, 'OBRA_OCCURRENCE_RESOLVE', 'Obra', obraId, {
      occurrenceId,
    });

    return { success: true };
  }

  addNonConformity(
    obraId: string,
    companyId: string,
    userId: string | undefined,
    input: CreateNonConformityInput,
  ) {
    return this.vistorias.addNonConformity(obraId, companyId, userId, input);
  }

  async getObraReportPreview(id: string, companyId: string, query: ObraReportQuery) {
    const obra = await getObraOrThrow(this.obrasRepository, id, companyId);
    const contract = await resolveLinkedContract(this.obrasRepository, obra, companyId);
    const mapped = mapObraForReport(obra, contract);
    return buildObraReportModel(mapped, companyId, {
      sections: query.sections,
      groupByStep: query.groupByStep,
      draft: query.draft,
    });
  }

  async getObraReportHtml(id: string, companyId: string, query: ObraReportQuery) {
    const model = await this.getObraReportPreview(id, companyId, query);
    const bodyHtml = buildObraReportHtml(model);
    return wrapObraReportDocument(bodyHtml);
  }

  async getObraReportPdf(id: string, companyId: string, query: ObraReportQuery) {
    const html = await this.getObraReportHtml(id, companyId, query);
    const { pdfBuffer } = await renderFullHtmlToPdf(html);
    return pdfBuffer;
  }

  async getObraAudit(obraId: string, companyId: string) {
    await getObraOrThrow(this.obrasRepository, obraId, companyId);

    const logs = await this.obrasRepository.findAuditLogsForObra(obraId, companyId);
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const users = await this.obrasRepository.findUsersByIds(userIds, companyId);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt,
      metadata: log.metadata,
      user: log.userId ? (userMap.get(log.userId) ?? null) : null,
    }));
  }
}
