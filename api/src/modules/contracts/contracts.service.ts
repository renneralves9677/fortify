import { ContractStatus } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { computeContractStatus, daysUntil } from '../../domain/contracts/contract-status.js';
import { sanitizeHtml } from '../../domain/contracts/html-sanitizer.js';
import {
  buildContractHtml,
  mergeAutoFields,
  renderDocumentForDisplay,
  validateTemplateFieldValues,
} from '../../domain/contracts/template-renderer.js';
import type { Contract } from '@prisma/client';
import { paginatedResult, paginationBounds } from '../../shared/pagination.js';
import type {
  AddendumContractInput,
  CompareVersionsQuery,
  CreateContractInput,
  ListContractsQuery,
  ListManagerContractsQuery,
  TransitionContractInput,
  UpdateContractInput,
} from './contracts.schema.js';
import type { ContractsRepositoryPort } from './contracts.repository.port.js';

function serializeContract(c: Contract | null) {
  if (!c) return null;
  const status = computeContractStatus(c.status, c.endDate);
  return {
    ...c,
    status,
    value: Number(c.value),
    vigenciaRestanteDias: daysUntil(c.endDate),
  };
}

export class ContractsService {
  constructor(private readonly contractsRepository: ContractsRepositoryPort) {}

  async listContracts(companyId: string, query: ListContractsQuery) {
    const { page, pageSize, search, status, type, title, partyName, periodFrom, periodTo } = query;
    const { skip, take } = paginationBounds(page, pageSize);
    const listFilters = { search, status, type, title, partyName, periodFrom, periodTo };
    const filters = { ...listFilters, skip, take };
    const [contracts, total] = await Promise.all([
      this.contractsRepository.findManyForCompany(companyId, filters),
      this.contractsRepository.countManyForCompany(companyId, listFilters),
    ]);
    return paginatedResult(
      contracts.map((c) => serializeContract(c)),
      total,
      page,
      pageSize,
    );
  }

  async listManagerContracts(companyId: string, query: ListManagerContractsQuery) {
    const { page, pageSize, search } = query;
    const { skip, take } = paginationBounds(page, pageSize);
    const [contracts, total] = await Promise.all([
      this.contractsRepository.findManagerContracts(companyId, { search, skip, take }),
      this.contractsRepository.countManyForCompany(companyId, { search, managerOnly: true }),
    ]);
    return paginatedResult(
      contracts.map((c) => serializeContract(c)),
      total,
      page,
      pageSize,
    );
  }

  async getContractById(id: string, companyId: string) {
    const contract = await this.contractsRepository.findByIdForCompany(id, companyId);
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }
    return serializeContract(contract);
  }

  async previewContract(id: string, companyId: string) {
    const contract = await this.contractsRepository.findByIdForCompany(id, companyId);
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }

    let html = contract.bodyHtml;
    const displayFlow =
      (await this.contractsRepository.findDisplayFlowForContract(id)) ??
      (await this.contractsRepository.findLatestCompletedFlowForContract(id));

    if (displayFlow) {
      const templateFields = contract.template?.fields ?? [];
      html = renderDocumentForDisplay(
        displayFlow.frozenBodyHtml,
        displayFlow.signers.map((s) => ({
          role: s.role,
          status: s.status,
          signerName: s.signerName,
          signatureImage: s.signatureImage,
          signatureTyped: s.signatureTyped,
          signedAt: s.signedAt,
        })),
        templateFields,
      );
    }

    return {
      html: sanitizeHtml(html),
      contract: serializeContract(contract),
    };
  }

  async createContract(companyId: string, input: CreateContractInput) {
    const template = await this.contractsRepository.findTemplateByIdForCompany(
      input.templateId,
      companyId,
    );
    if (!template) {
      throw new AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
    }

    const fields = template.fields ?? [];
    const missing = validateTemplateFieldValues(fields, input.fieldValues);
    if (missing.length) {
      throw new AppError(
        400,
        `Campos obrigatórios: ${missing.join(', ')}`,
        'TEMPLATE_FIELDS_REQUIRED',
      );
    }

    const fieldValues = mergeAutoFields(input.fieldValues, fields);
    const bodyHtml = sanitizeHtml(buildContractHtml(template.bodyHtml, fieldValues, fields));
    const partyName = input.partyName || fieldValues.CONTRATANTE_NOME || input.title;
    const partyDocument = input.partyDocument || fieldValues.CONTRATANTE_DOCUMENTO || undefined;
    const valueFromField = fieldValues.VALOR_CONTRATO
      ? Number.parseFloat(fieldValues.VALOR_CONTRATO.replace(/\./g, '').replace(',', '.'))
      : input.value;

    const contract = await withPrismaError(() =>
      this.contractsRepository.create({
        company: { connect: { id: companyId } },
        template: { connect: { id: template.id } },
        title: input.title,
        type: template.type,
        partyName,
        partyDocument,
        value: Number.isNaN(valueFromField) ? input.value : valueFromField,
        valueMonthly: input.valueMonthly,
        startDate: input.startDate
          ? new Date(input.startDate)
          : fieldValues.DATA_INICIO
            ? new Date(fieldValues.DATA_INICIO)
            : null,
        endDate: input.endDate
          ? new Date(input.endDate)
          : fieldValues.DATA_FIM
            ? new Date(fieldValues.DATA_FIM)
            : null,
        fieldValues,
        bodyHtml,
        status: ContractStatus.RASCUNHO,
      }),
    );
    return serializeContract(contract);
  }

  async updateContract(id: string, companyId: string, input: UpdateContractInput) {
    const contract = await this.contractsRepository.findByIdForCompany(id, companyId);
    if (!contract || contract.status !== ContractStatus.RASCUNHO) {
      throw new AppError(400, 'Somente rascunhos podem ser editados', 'INVALID_STATUS');
    }

    const activeFlow = await this.contractsRepository.findInProgressFlowForContract(id);
    if (activeFlow) {
      throw new AppError(400, 'Contrato com fluxo de assinatura em andamento', 'FLOW_IN_PROGRESS');
    }

    const template = contract.template;
    if (!template?.bodyHtml) {
      throw new AppError(400, 'Contrato sem template associado', 'INVALID_CONTRACT');
    }

    const fields = template.fields ?? [];
    const fieldValues = mergeAutoFields(
      (input.fieldValues ?? contract.fieldValues) as Record<string, string>,
      fields,
    );
    const missing = validateTemplateFieldValues(fields, fieldValues);
    if (missing.length) {
      throw new AppError(
        400,
        `Campos obrigatórios: ${missing.join(', ')}`,
        'TEMPLATE_FIELDS_REQUIRED',
      );
    }

    const bodyHtml = sanitizeHtml(buildContractHtml(template.bodyHtml, fieldValues, fields));

    const updated = await withPrismaError(() =>
      this.contractsRepository.update(contract.id, {
        ...input,
        fieldValues,
        bodyHtml,
        partyName: input.partyName ?? fieldValues.CONTRATANTE_NOME ?? contract.partyName,
        partyDocument: input.partyDocument ?? fieldValues.CONTRATANTE_DOCUMENTO ?? contract.partyDocument,
        startDate: input.startDate
          ? new Date(input.startDate)
          : fieldValues.DATA_INICIO
            ? new Date(fieldValues.DATA_INICIO)
            : contract.startDate,
        endDate: input.endDate
          ? new Date(input.endDate)
          : fieldValues.DATA_FIM
            ? new Date(fieldValues.DATA_FIM)
            : contract.endDate,
      }),
    );
    return serializeContract(updated);
  }

  async renewContract(id: string, companyId: string) {
    const contract = await this.contractsRepository.findByIdForCompany(id, companyId);
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }
    if (!contract.templateId) {
      throw new AppError(400, 'Contrato sem template associado', 'INVALID_CONTRACT');
    }

    const renewed = await withPrismaError(() =>
      this.contractsRepository.create({
        company: { connect: { id: contract.companyId } },
        template: { connect: { id: contract.templateId! } },
        title: `${contract.title} (Renovação)`,
        type: contract.type,
        partyName: contract.partyName,
        partyDocument: contract.partyDocument,
        value: contract.value,
        valueMonthly: contract.valueMonthly,
        startDate: new Date(),
        endDate: contract.endDate,
        fieldValues: contract.fieldValues as object,
        bodyHtml: contract.bodyHtml,
        status: ContractStatus.RASCUNHO,
        parentContractId: contract.id,
      }),
    );
    return serializeContract(renewed);
  }

  async closeContract(id: string, companyId: string) {
    const result = await this.contractsRepository.closeByIdForCompany(id, companyId);
    if (!result.count) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }
    const contract = await this.contractsRepository.findByIdForCompany(id, companyId);
    return serializeContract(contract);
  }

  async createAddendum(id: string, companyId: string, input: AddendumContractInput) {
    const contract = await this.contractsRepository.findByIdForCompany(id, companyId);
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }
    if (!contract.templateId) {
      throw new AppError(400, 'Contrato sem template associado', 'INVALID_CONTRACT');
    }

    const addendum = await withPrismaError(() =>
      this.contractsRepository.create({
        company: { connect: { id: contract.companyId } },
        template: { connect: { id: contract.templateId! } },
        title: `${contract.title} — Aditivo`,
        type: contract.type,
        partyName: contract.partyName,
        value: input.value ?? contract.value,
        fieldValues: contract.fieldValues as object,
        bodyHtml: contract.bodyHtml,
        status: ContractStatus.RASCUNHO,
        parentContractId: contract.id,
      }),
    );
    return serializeContract(addendum);
  }

  private static readonly ALLOWED_TRANSITIONS: Partial<
    Record<ContractStatus, ContractStatus[]>
  > = {
    [ContractStatus.RASCUNHO]: [ContractStatus.REVISAO, ContractStatus.CANCELADO],
    [ContractStatus.REVISAO]: [ContractStatus.RASCUNHO, ContractStatus.APROVACAO, ContractStatus.CANCELADO],
    [ContractStatus.APROVACAO]: [ContractStatus.REVISAO, ContractStatus.ENVIO, ContractStatus.CANCELADO],
    [ContractStatus.ENVIO]: [ContractStatus.AGUARDANDO_ASSINATURA, ContractStatus.CANCELADO],
    [ContractStatus.AGUARDANDO_ASSINATURA]: [ContractStatus.ASSINADO, ContractStatus.CANCELADO],
    [ContractStatus.ASSINADO]: [ContractStatus.ATIVO],
    [ContractStatus.ATIVO]: [ContractStatus.ENCERRADO, ContractStatus.ARQUIVADO],
    [ContractStatus.VENCENDO]: [ContractStatus.RENOVACAO, ContractStatus.ENCERRADO],
  };

  async transitionStatus(
    id: string,
    companyId: string,
    userId: string | undefined,
    input: TransitionContractInput,
  ) {
    const contract = await this.contractsRepository.findByIdForCompany(id, companyId);
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }

    const allowed = ContractsService.ALLOWED_TRANSITIONS[contract.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new AppError(
        400,
        `Transição inválida de ${contract.status} para ${input.status}`,
        'INVALID_TRANSITION',
      );
    }

    const snapshotStatuses: ContractStatus[] = [
      ContractStatus.APROVACAO,
      ContractStatus.ENVIO,
      ContractStatus.AGUARDANDO_ASSINATURA,
    ];
    if (snapshotStatuses.includes(input.status)) {
      await this.createVersionSnapshot(contract, userId, input.changeReason);
    }

    const updated = await withPrismaError(() =>
      this.contractsRepository.updateStatus(contract.id, input.status),
    );
    return serializeContract(updated);
  }

  async createVersionSnapshot(
    contract: Contract & { template?: { bodyHtml: string } | null },
    createdById?: string,
    changeReason?: string,
  ) {
    const count = await this.contractsRepository.countVersions(contract.id);
    const versionNumber = `v${count + 1}`;

    return withPrismaError(() =>
      this.contractsRepository.createVersion({
        contract: { connect: { id: contract.id } },
        versionNumber,
        bodyHtml: contract.bodyHtml,
        fieldValues: contract.fieldValues as object,
        partyName: contract.partyName,
        value: contract.value,
        changeReason,
        createdById,
      }),
    );
  }

  async listVersions(id: string, companyId: string) {
    const contract = await this.contractsRepository.findByIdForCompany(id, companyId);
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }
    const versions = await this.contractsRepository.findVersions(id);
    return versions.map((v) => ({
      ...v,
      value: Number(v.value),
    }));
  }

  async compareVersions(id: string, companyId: string, query: CompareVersionsQuery) {
    const contract = await this.contractsRepository.findByIdForCompany(id, companyId);
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }

    const v1 = await this.contractsRepository.findVersionByNumber(id, query.v1);
    const v2 = await this.contractsRepository.findVersionByNumber(id, query.v2);
    if (!v1 || !v2) {
      throw new AppError(404, 'Versão não encontrada', 'VERSION_NOT_FOUND');
    }

    const fields1 = v1.fieldValues as Record<string, string>;
    const fields2 = v2.fieldValues as Record<string, string>;
    const allKeys = new Set([...Object.keys(fields1), ...Object.keys(fields2)]);
    const fieldDiffs: Array<{ key: string; v1: string | undefined; v2: string | undefined }> = [];

    for (const key of allKeys) {
      if (fields1[key] !== fields2[key]) {
        fieldDiffs.push({ key, v1: fields1[key], v2: fields2[key] });
      }
    }

    return {
      v1: query.v1,
      v2: query.v2,
      valueChanged: Number(v1.value) !== Number(v2.value),
      valueV1: Number(v1.value),
      valueV2: Number(v2.value),
      partyNameChanged: v1.partyName !== v2.partyName,
      bodyHtmlChanged: v1.bodyHtml !== v2.bodyHtml,
      fieldDiffs,
    };
  }
}
