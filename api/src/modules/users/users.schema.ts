import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination.js';

const userRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER']);

export const listUsersQuerySchema = paginationQuerySchema;
export type ListUsersQuery = z.output<typeof listUsersQuerySchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  role: userRoleSchema.default('VIEWER'),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: userRoleSchema.optional(),
  active: z.boolean().optional(),
});

export type CreateUserInput = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.output<typeof updateUserSchema>;
