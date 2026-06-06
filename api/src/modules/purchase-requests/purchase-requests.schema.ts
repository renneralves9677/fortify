import { z } from 'zod';

export const createPurchaseRequestSchema = z.object({
  description: z.string().min(3),
  amount: z.number().positive(),
  obraId: z.string().uuid().optional(),
});

export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;

export const updatePurchaseRequestStatusSchema = z.object({
  status: z.enum(['RASCUNHO', 'COTACAO', 'APROVACAO', 'APROVADA', 'CANCELADA']),
});

export type UpdatePurchaseRequestStatusInput = z.infer<typeof updatePurchaseRequestStatusSchema>;
