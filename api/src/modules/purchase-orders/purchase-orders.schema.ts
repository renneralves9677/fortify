import { z } from 'zod';
import { ObraCostCategory } from '@prisma/client';
import { isPurchaseOrderCategory } from '../../domain/obras/cost-categories.js';
import { cnpjSchema } from '../../shared/validators/br.js';

export const createPurchaseOrderSchema = z
  .object({
    obraId: z.string().uuid(),
    category: z.nativeEnum(ObraCostCategory),
    payerCnpj: cnpjSchema,
    description: z.string().min(3),
    amount: z.number().positive(),
    obraStepId: z.string().uuid().optional(),
  })
  .refine((data) => isPurchaseOrderCategory(data.category), {
    message: 'Categoria inválida para ordem de compra',
    path: ['category'],
  });

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const receivePurchaseOrderSchema = z.object({
  amount: z.number().positive(),
});

export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
