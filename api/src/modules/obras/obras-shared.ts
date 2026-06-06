import { AppError } from '../../core/errors/AppError.js';
import { getCategoryLabel } from '../../domain/obras/cost-categories.js';
import type { ObrasRepositoryPort } from './obras.repository.port.js';

export function serializeObraListItem(
  o: Awaited<ReturnType<ObrasRepositoryPort['findManyByCompany']>>[number],
) {
  return { ...o, budgetPlanned: Number(o.budgetPlanned) };
}

export function assertObraActive(obra: { status: string }) {
  if (obra.status === 'encerrada') {
    throw new AppError(400, 'Obra encerrada — operação não permitida', 'OBRA_CLOSED');
  }
}

export async function getObraOrThrow(
  repo: ObrasRepositoryPort,
  obraId: string,
  companyId: string,
) {
  const obra = await repo.findByIdForCompany(obraId, companyId);
  if (!obra) {
    throw new AppError(404, 'Obra não encontrada', 'OBRA_NOT_FOUND');
  }
  return obra;
}

export async function assertObraStep(
  repo: ObrasRepositoryPort,
  obraId: string,
  companyId: string,
  obraStepId?: string,
) {
  if (!obraStepId) return;
  const step = await repo.findStepForObra(obraStepId, obraId, companyId);
  if (!step) {
    throw new AppError(400, 'Etapa do roteiro inválida', 'STEP_NOT_FOUND');
  }
}

export async function assertContractAvailableForObra(
  repo: ObrasRepositoryPort,
  contractId: string,
  companyId: string,
) {
  const contract = await repo.findContractByIdForCompany(contractId, companyId);
  if (!contract) {
    throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
  }
  if (!['ASSINADO', 'ATIVO'].includes(contract.status)) {
    throw new AppError(
      400,
      'Somente contratos assinados podem ser vinculados a uma obra',
      'CONTRACT_NOT_SIGNED',
    );
  }
  const linked = await repo.findObraByContractId(contractId, companyId);
  if (linked) {
    throw new AppError(
      400,
      `Este contrato já está vinculado à obra "${linked.name}"`,
      'CONTRACT_ALREADY_LINKED',
    );
  }
}

export async function resolveLinkedContract(
  repo: ObrasRepositoryPort,
  obra: {
    contractId: string | null;
    contract: { id: string; title: string; partyName: string; status: string } | null;
  },
  companyId: string,
) {
  if (obra.contract) {
    return {
      id: obra.contract.id,
      title: obra.contract.title,
      partyName: obra.contract.partyName,
      status: obra.contract.status,
    };
  }
  if (!obra.contractId) return null;
  const contract = await repo.findContractByIdForCompany(obra.contractId, companyId);
  if (!contract) return null;
  return {
    id: contract.id,
    title: contract.title,
    partyName: contract.partyName,
    status: contract.status,
  };
}

export function mapObraForReport(
  obra: NonNullable<Awaited<ReturnType<ObrasRepositoryPort['findByIdForCompany']>>>,
  contract: Awaited<ReturnType<typeof resolveLinkedContract>>,
) {
  return {
    id: obra.id,
    name: obra.name,
    address: obra.address,
    status: obra.status,
    budgetPlanned: Number(obra.budgetPlanned),
    contract,
    steps: obra.steps,
    vistorias: obra.vistorias.map((v) => ({
      id: v.id,
      type: v.type,
      description: v.description,
      photoUrls: v.photoUrls,
      startedAt: v.startedAt,
      endedAt: v.endedAt,
      obraStepId: v.obraStepId,
      obraStep: v.obraStep,
    })),
    custos: obra.custos.map((c) => ({
      id: c.id,
      category: c.category,
      description: c.description,
      amount: Number(c.amount),
      date: c.date,
      obraStepId: c.obraStepId,
      obraStep: c.obraStep,
      categoryLabel: getCategoryLabel(c.category),
    })),
    purchaseOrders: obra.purchaseOrders.map((p) => ({
      id: p.id,
      number: p.number,
      category: p.category,
      description: p.description,
      amount: Number(p.amount),
      receivedAmount: Number(p.receivedAmount),
      status: p.status,
      obraStepId: p.obraStepId,
      obraStep: p.obraStep,
      categoryLabel: getCategoryLabel(p.category),
    })),
  };
}
