import {
  ApprovalStatus,
  ApprovalStepStatus,
  ContractStatus,
  type Prisma,
} from '@prisma/client';
import { prisma } from '../../core/database/prisma.js';

export class WorkflowRepository {
  findContractByIdForCompany(contractId: string, companyId: string) {
    return prisma.contract.findFirst({ where: { id: contractId, companyId } });
  }

  updateContractStatus(contractId: string, status: ContractStatus) {
    return prisma.contract.update({ where: { id: contractId }, data: { status } });
  }

  findPendingApproval(contractId: string) {
    return prisma.contractApproval.findFirst({
      where: { contractId, status: ApprovalStatus.PENDING },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  createApproval(data: Prisma.ContractApprovalCreateInput) {
    return prisma.contractApproval.create({
      data,
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  updateApproval(id: string, data: Prisma.ContractApprovalUpdateInput) {
    return prisma.contractApproval.update({
      where: { id },
      data,
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  updateStep(id: string, data: Prisma.ContractApprovalStepUpdateInput) {
    return prisma.contractApprovalStep.update({ where: { id }, data });
  }

  findStepByApprovalAndOrder(approvalId: string, stepOrder: number) {
    return prisma.contractApprovalStep.findFirst({
      where: { approvalId, stepOrder },
    });
  }

  activateNextStep(approvalId: string, nextOrder: number) {
    return prisma.contractApprovalStep.updateMany({
      where: { approvalId, stepOrder: nextOrder },
      data: { status: ApprovalStepStatus.PENDING },
    });
  }
}
