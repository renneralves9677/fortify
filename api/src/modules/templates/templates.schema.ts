import { z } from 'zod';
import { ContractType } from '@prisma/client';

const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  fieldType: z
    .enum(['text', 'textarea', 'cpf_cnpj', 'currency', 'date', 'auto', 'signature'])
    .default('text'),
  required: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export const createTemplateSchema = z.object({
  name: z.string().min(2),
  type: z.nativeEnum(ContractType),
  description: z.string().optional(),
  bodyHtml: z.string().min(1),
  fields: z.array(fieldSchema).default([]),
});

export type CreateTemplateInput = z.output<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.nativeEnum(ContractType).optional(),
  description: z.string().optional(),
  bodyHtml: z.string().min(1).optional(),
  fields: z.array(fieldSchema).optional(),
  changeReason: z.string().optional(),
});

export type UpdateTemplateInput = z.output<typeof updateTemplateSchema>;

export const previewTemplateSchema = z.object({
  bodyHtml: z.string().min(1),
  fields: z.array(fieldSchema).default([]),
});

export type PreviewTemplateInput = z.output<typeof previewTemplateSchema>;

export const createFromPresetSchema = z.object({
  presetKey: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
});

export type CreateFromPresetInput = z.output<typeof createFromPresetSchema>;
