import {
  ApprovalStatus,
  ApprovalStepStatus,
  ContractStatus,
} from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { buildStepsFromValue } from '../../domain/contracts/approval-matrix.js';
import type { ApproveStepInput, RejectApprovalInput } from './workflow.schema.js';
import { WorkflowRepository } from './workflow.repository.js';

const ROLE_APPROVAL_MAP: Record<string, string[]> = {
  ADMIN: ['GESTOR', 'DIRETOR', 'JURIDICO', 'FINANCEIRO', 'ENGENHARIA'],
  OPERATOR: ['GESTOR', 'DIRETOR'],
  VIEWER: [],
};

function canApprove(userRole: string, requiredRole: string): boolean {
  const allowed = ROLE_APPROVAL_MAP[userRole] ?? [];
  return allowed.includes(requiredRole);
}

function serializeApproval(approval: {
  id: string;
  contractId: string;
  status: ApprovalStatus;
  currentStep: number;
  rejectedReason: string | null;
  steps: Array<{
    id: string;
    stepOrder: number;
    requiredRole: string;
    status: ApprovalStepStatus;
    comment: string | null;
    actedAt: Date | null;
  }>;
}) {
  return approval;
}

export class WorkflowService {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async submitRevisao(contractId: string, companyId: string) {
    const contract = await this.workflowRepository.findContractByIdForCompany(
      contractId,
      companyId,
    );
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }
    if (contract.status !== ContractStatus.RASCUNHO) {
      throw new AppError(400, 'Somente rascunhos podem ir para revisão', 'INVALID_STATUS');
    }

    await withPrismaError(() =>
      this.workflowRepository.updateContractStatus(contractId, ContractStatus.REVISAO),
    );
    return { contractId, status: ContractStatus.REVISAO };
  }

  async submitAprovacao(contractId: string, companyId: string) {
    const contract = await this.workflowRepository.findContractByIdForCompany(
      contractId,
      companyId,
    );
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }
    if (contract.status !== ContractStatus.REVISAO) {
      throw new AppError(400, 'Contrato deve estar em revisão', 'INVALID_STATUS');
    }

    const pending = await this.workflowRepository.findPendingApproval(contractId);
    if (pending) {
      throw new AppError(400, 'Já existe aprovação pendente', 'APPROVAL_EXISTS');
    }

    const stepDefs = buildStepsFromValue(Number(contract.value), contract.type);
    const approval = await withPrismaError(() =>
      this.workflowRepository.createApproval({
        contract: { connect: { id: contractId } },
        status: ApprovalStatus.PENDING,
        currentStep: 1,
        steps: {
          create: stepDefs.map((s, idx) => ({
            stepOrder: s.stepOrder,
            requiredRole: s.requiredRole,
            status: idx === 0 ? ApprovalStepStatus.PENDING : ApprovalStepStatus.WAITING,
          })),
        },
      }),
    );

    await this.workflowRepository.updateContractStatus(contractId, ContractStatus.APROVACAO);
    return serializeApproval(approval);
  }

  async approveStep(
    contractId: string,
    companyId: string,
    userId: string,
    userRole: string,
    input: ApproveStepInput,
  ) {
    const contract = await this.workflowRepository.findContractByIdForCompany(
      contractId,
      companyId,
    );
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }

    const approval = await this.workflowRepository.findPendingApproval(contractId);
    if (!approval) {
      throw new AppError(404, 'Aprovação pendente não encontrada', 'APPROVAL_NOT_FOUND');
    }

    const currentStep = approval.steps.find((s) => s.stepOrder === approval.currentStep);
    if (!currentStep || currentStep.status !== ApprovalStepStatus.PENDING) {
      throw new AppError(400, 'Etapa atual não está pendente', 'INVALID_STEP');
    }

    if (!canApprove(userRole, currentStep.requiredRole)) {
      throw new AppError(403, 'Sem permissão para aprovar esta etapa', 'FORBIDDEN_APPROVAL');
    }

    await this.workflowRepository.updateStep(currentStep.id, {
      status: ApprovalStepStatus.APPROVED,
      approverUserId: userId,
      comment: input.comment,
      actedAt: new Date(),
    });

    const nextOrder = approval.currentStep + 1;
    const nextStep = approval.steps.find((s) => s.stepOrder === nextOrder);

    if (nextStep) {
      await this.workflowRepository.activateNextStep(approval.id, nextOrder);
      const updated = await this.workflowRepository.updateApproval(approval.id, {
        currentStep: nextOrder,
      });
      return serializeApproval(updated);
    }

    const completed = await this.workflowRepository.updateApproval(approval.id, {
      status: ApprovalStatus.APPROVED,
    });
    await this.workflowRepository.updateContractStatus(contractId, ContractStatus.ENVIO);
    return serializeApproval(completed);
  }

  async reject(
    contractId: string,
    companyId: string,
    userId: string,
    userRole: string,
    input: RejectApprovalInput,
  ) {
    const contract = await this.workflowRepository.findContractByIdForCompany(
      contractId,
      companyId,
    );
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }

    const approval = await this.workflowRepository.findPendingApproval(contractId);
    if (!approval) {
      throw new AppError(404, 'Aprovação pendente não encontrada', 'APPROVAL_NOT_FOUND');
    }

    const currentStep = approval.steps.find((s) => s.stepOrder === approval.currentStep);
    if (!currentStep) {
      throw new AppError(400, 'Etapa inválida', 'INVALID_STEP');
    }

    if (!canApprove(userRole, currentStep.requiredRole)) {
      throw new AppError(403, 'Sem permissão para rejeitar esta etapa', 'FORBIDDEN_APPROVAL');
    }

    await this.workflowRepository.updateStep(currentStep.id, {
      status: ApprovalStepStatus.REJECTED,
      approverUserId: userId,
      comment: input.reason,
      actedAt: new Date(),
    });

    const rejected = await this.workflowRepository.updateApproval(approval.id, {
      status: ApprovalStatus.REJECTED,
      rejectedReason: input.reason,
    });
    await this.workflowRepository.updateContractStatus(contractId, ContractStatus.REVISAO);
    return serializeApproval(rejected);
  }
}
