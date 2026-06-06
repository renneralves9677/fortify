import { z } from 'zod';
import { ObraCostCategory, VistoriaType } from '@prisma/client';
import { isDirectCostAllowed } from '../../domain/obras/cost-categories.js';
import {
  idParamSchema,
  obraOccurrenceParamsSchema,
  obraStepParamsSchema,
} from '../../shared/params.js';

export const obraIdParamSchema = idParamSchema;
export { obraStepParamsSchema, obraOccurrenceParamsSchema };

export const createObraSchema = z.object({
  name: z.string().min(2),
  contractId: z.string().uuid(),
  address: z.string().optional(),
  budgetPlanned: z.number().nonnegative().default(0),
});

export type CreateObraInput = z.output<typeof createObraSchema>;

export const updateObraBudgetSchema = z.object({
  budgetPlanned: z.number().nonnegative(),
});

export type UpdateObraBudgetInput = z.output<typeof updateObraBudgetSchema>;

export const updateStepSchema = z.object({
  done: z.boolean().optional(),
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
});

export type UpdateStepInput = z.output<typeof updateStepSchema>;

export const createStepSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
});

export type CreateStepInput = z.output<typeof createStepSchema>;

export const reorderStepsSchema = z.object({
  stepIds: z.array(z.string().uuid()).min(1),
});

export type ReorderStepsInput = z.output<typeof reorderStepsSchema>;

const dateInputSchema = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
]);

export function parseDateInput(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  return new Date(value);
}

export const createVistoriaSchema = z
  .object({
    type: z.nativeEnum(VistoriaType),
    description: z.string().min(3),
    photoUrls: z.array(z.string()).default([]),
    startedAt: dateInputSchema,
    endedAt: dateInputSchema,
    obraStepId: z.string().uuid().optional(),
  })
  .refine((data) => parseDateInput(data.endedAt) >= parseDateInput(data.startedAt), {
    message: 'Data fim deve ser igual ou posterior à data início',
    path: ['endedAt'],
  });

export type CreateVistoriaInput = z.output<typeof createVistoriaSchema>;

export const obraReportQuerySchema = z.object({
  sections: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? s.split(',').map((x) => x.trim())
        : ['roteiro', 'vistorias', 'custos', 'oc', 'resumo'],
    )
    .pipe(
      z.array(z.enum(['roteiro', 'vistorias', 'custos', 'oc', 'resumo'])).min(1),
    ),
  groupByStep: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((v) => v === true || v === 'true')
    .default(true),
  draft: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((v) => v === true || v === 'true')
    .default(false),
});

export type ObraReportQuery = z.output<typeof obraReportQuerySchema>;

export const createCustoSchema = z
  .object({
    category: z.nativeEnum(ObraCostCategory),
    description: z.string().min(10, 'Justificativa deve ter pelo menos 10 caracteres'),
    amount: z.number().positive(),
    date: z.string().datetime().optional(),
    obraStepId: z.string().uuid().optional(),
  })
  .refine((data) => isDirectCostAllowed(data.category), {
    message: 'Esta categoria exige ordem de compra',
    path: ['category'],
  });

export type CreateCustoInput = z.infer<typeof createCustoSchema>;

export const createOccurrenceSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  severity: z.enum(['baixa', 'media', 'alta']).default('media'),
});

export type CreateOccurrenceInput = z.infer<typeof createOccurrenceSchema>;

export const createNonConformitySchema = z.object({
  vistoriaId: z.string().uuid(),
  description: z.string().min(3),
  severity: z.enum(['baixa', 'media', 'alta']).default('media'),
  dueDate: z.string().datetime().optional(),
});

export type CreateNonConformityInput = z.infer<typeof createNonConformitySchema>;
