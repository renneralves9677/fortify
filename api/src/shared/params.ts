import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const contractIdParamSchema = z.object({
  contractId: z.string().uuid(),
});

export const flowIdParamSchema = z.object({
  flowId: z.string().uuid(),
});

export const obraStepParamsSchema = z.object({
  id: z.string().uuid(),
  stepId: z.string().uuid(),
});

export const obraOccurrenceParamsSchema = z.object({
  id: z.string().uuid(),
  occurrenceId: z.string().uuid(),
});
