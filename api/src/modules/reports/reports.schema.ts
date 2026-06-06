import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination.js';

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)');

const dateRangeRefine = (data: { from?: string; to?: string }) => {
  if (data.from && data.to && data.from > data.to) {
    return false;
  }
  return true;
};

export const reportListQuerySchema = paginationQuerySchema
  .extend({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine(dateRangeRefine, { message: 'Data inicial deve ser anterior ou igual à final' });

export const reportExportFormatSchema = z.enum(['csv', 'xlsx', 'pdf']).default('csv');

export const reportExportQuerySchema = z
  .object({
    format: reportExportFormatSchema,
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine(dateRangeRefine, { message: 'Data inicial deve ser anterior ou igual à final' });

export type ReportListQuery = z.output<typeof reportListQuerySchema>;
export type ReportExportQuery = z.output<typeof reportExportQuerySchema>;
export type ReportExportFormat = z.output<typeof reportExportFormatSchema>;

export type ReportDateRange = {
  from?: string;
  to?: string;
};

export const dashboardQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    months: z.coerce.number().int().min(1).max(24).default(6),
  })
  .refine(dateRangeRefine, { message: 'Data inicial deve ser anterior ou igual à final' });

export type DashboardQuery = z.output<typeof dashboardQuerySchema>;

export function defaultDashboardRange(months: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - (months - 1), 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(from), to: fmt(to) };
}

export function createdAtRangeFilter(range: ReportDateRange) {
  if (!range.from && !range.to) return undefined;
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (range.from) {
    createdAt.gte = new Date(`${range.from}T00:00:00.000Z`);
  }
  if (range.to) {
    createdAt.lte = new Date(`${range.to}T23:59:59.999Z`);
  }
  return createdAt;
}
