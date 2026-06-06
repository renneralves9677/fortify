import { z } from 'zod';
import { ContractStatus, ContractType } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/pagination.js';
import { idParamSchema } from '../../shared/params.js';

export const contractIdParamSchema = idParamSchema;
import { optionalCnpjSchema } from '../../shared/validators/br.js';

export const listContractsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ContractStatus).optional(),
  type: z.nativeEnum(ContractType).optional(),
  title: z.string().optional(),
  partyName: z.string().optional(),
  periodFrom: z.string().date().optional(),
  periodTo: z.string().date().optional(),
});

export const listManagerContractsQuerySchema = paginationQuerySchema;

export type ListContractsQuery = z.output<typeof listContractsQuerySchema>;
export type ListManagerContractsQuery = z.output<typeof listManagerContractsQuerySchema>;

export const createContractSchema = z.object({
  templateId: z.string().uuid(),
  title: z.string().min(2),
  partyName: z.string().min(2),
  partyDocument: optionalCnpjSchema,
  value: z.number().nonnegative(),
  valueMonthly: z.boolean().default(false),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  fieldValues: z.record(z.string()).default({}),
});

export type CreateContractInput = z.output<typeof createContractSchema>;

export const updateContractSchema = z.object({
  title: z.string().min(2).optional(),
  partyName: z.string().min(2).optional(),
  partyDocument: optionalCnpjSchema,
  value: z.number().nonnegative().optional(),
  valueMonthly: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  fieldValues: z.record(z.string()).optional(),
});

export type UpdateContractInput = z.output<typeof updateContractSchema>;

export const addendumContractSchema = z.object({
  value: z.number().nonnegative().optional(),
});

export type AddendumContractInput = z.output<typeof addendumContractSchema>;

export const transitionContractSchema = z.object({
  status: z.nativeEnum(ContractStatus),
  changeReason: z.string().optional(),
});

export type TransitionContractInput = z.output<typeof transitionContractSchema>;

export const compareVersionsQuerySchema = z.object({
  v1: z.string().min(1),
  v2: z.string().min(1),
});

export type CompareVersionsQuery = z.output<typeof compareVersionsQuerySchema>;
