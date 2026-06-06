import { z } from 'zod';
import { idParamSchema } from '../../shared/params.js';

export const workflowContractParamsSchema = idParamSchema;

export const rejectApprovalSchema = z.object({
  reason: z.string().min(3),
});

export type RejectApprovalInput = z.output<typeof rejectApprovalSchema>;

export const approveStepSchema = z.object({
  comment: z.string().optional(),
});

export type ApproveStepInput = z.output<typeof approveStepSchema>;
