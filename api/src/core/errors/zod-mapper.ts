import type { ZodSchema, z } from 'zod';
import { ZodError } from 'zod';
import { AppError } from './AppError.js';

export function fromZodError(error: ZodError): AppError {
  const details = error.errors.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  return new AppError(400, 'Dados inválidos', 'VALIDATION_ERROR', details);
}

export function parseBody<T extends ZodSchema>(
  schema: T,
  data: unknown,
): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw fromZodError(result.error);
  }
  return result.data;
}

export function parseQuery<T extends ZodSchema>(
  schema: T,
  data: unknown,
): z.output<T> {
  return parseBody(schema, data);
}

export function parseParams<T extends ZodSchema>(
  schema: T,
  data: unknown,
): z.output<T> {
  return parseBody(schema, data);
}
