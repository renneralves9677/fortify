import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { fromZodError, parseBody } from './zod-mapper.js';

describe('fromZodError', () => {
  it('maps ZodError to AppError with field details', () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'invalid' });
    if (result.success) throw new Error('expected failure');

    const mapped = fromZodError(result.error);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.code).toBe('VALIDATION_ERROR');
    expect(mapped.message).toBe('Dados inválidos');
    expect(mapped.details?.[0].field).toBe('email');
  });
});

describe('parseBody', () => {
  it('returns parsed data on success', () => {
    const schema = z.object({ name: z.string() });
    expect(parseBody(schema, { name: 'Fortify' })).toEqual({ name: 'Fortify' });
  });

  it('throws AppError on invalid data', () => {
    const schema = z.object({ name: z.string().min(2) });
    expect(() => parseBody(schema, { name: 'a' })).toThrowError(/Dados inválidos/);
  });
});
