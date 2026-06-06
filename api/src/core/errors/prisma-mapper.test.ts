import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { mapPrismaError } from './prisma-mapper.js';

describe('mapPrismaError', () => {
  it('maps P2002 with email target to friendly message', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.0.0',
      meta: { target: ['companyId', 'email'] },
    });
    const mapped = mapPrismaError(error);
    expect(mapped.statusCode).toBe(409);
    expect(mapped.message).toBe('E-mail já cadastrado');
    expect(mapped.code).toBe('DUPLICATE');
  });

  it('maps P2002 without email to generic duplicate', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.0.0',
      meta: { target: ['id'] },
    });
    const mapped = mapPrismaError(error);
    expect(mapped.message).toBe('Registro já existe');
  });

  it('maps P2025 to not found', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '6.0.0',
    });
    const mapped = mapPrismaError(error);
    expect(mapped.statusCode).toBe(404);
    expect(mapped.message).toBe('Registro não encontrado');
  });

  it('maps unknown errors to internal', () => {
    const mapped = mapPrismaError(new Error('database exploded'));
    expect(mapped.statusCode).toBe(500);
    expect(mapped.message).toBe('Erro interno. Tente novamente.');
    expect(mapped.code).toBe('INTERNAL');
  });
});
