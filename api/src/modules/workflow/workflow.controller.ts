import type { Response } from 'express';
import { parseBody, parseParams } from '../../core/errors/zod-mapper.js';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  approveStepSchema,
  rejectApprovalSchema,
  workflowContractParamsSchema,
} from './workflow.schema.js';
import type { WorkflowService } from './workflow.service.js';

export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  async submitRevisao(req: AuthRequest, res: Response): Promise<void> {
    const { id: contractId } = parseParams(workflowContractParamsSchema, req.params);
    const result = await this.workflowService.submitRevisao(contractId, req.companyId!);
    res.json(result);
  }

  async submitAprovacao(req: AuthRequest, res: Response): Promise<void> {
    const { id: contractId } = parseParams(workflowContractParamsSchema, req.params);
    const result = await this.workflowService.submitAprovacao(contractId, req.companyId!);
    res.json(result);
  }

  async approveStep(req: AuthRequest, res: Response): Promise<void> {
    const { id: contractId } = parseParams(workflowContractParamsSchema, req.params);
    const input = parseBody(approveStepSchema, req.body);
    const result = await this.workflowService.approveStep(
      contractId,
      req.companyId!,
      req.user!.userId,
      req.user!.role,
      input,
    );
    res.json(result);
  }

  async reject(req: AuthRequest, res: Response): Promise<void> {
    const { id: contractId } = parseParams(workflowContractParamsSchema, req.params);
    const input = parseBody(rejectApprovalSchema, req.body);
    const result = await this.workflowService.reject(
      contractId,
      req.companyId!,
      req.user!.userId,
      req.user!.role,
      input,
    );
    res.json(result);
  }
}
