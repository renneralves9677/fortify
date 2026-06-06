import { Prisma } from '@prisma/client';
import { AppError } from './AppError.js';

export function mapPrismaError(error: unknown): AppError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = error.meta?.target?.toString() ?? '';
      const message = target.includes('email')
        ? 'E-mail já cadastrado'
        : 'Registro já existe';
      return new AppError(409, message, 'DUPLICATE');
    }
    if (error.code === 'P2025') {
      return new AppError(404, 'Registro não encontrado', 'NOT_FOUND');
    }
    if (error.code === 'P2003') {
      return new AppError(400, 'Referência inválida', 'INVALID_REFERENCE');
    }
    if (error.code === 'P2014') {
      return new AppError(400, 'Operação não permitida', 'INVALID_RELATION');
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(400, 'Dados inválidos', 'VALIDATION_ERROR');
  }

  return new AppError(500, 'Erro interno. Tente novamente.', 'INTERNAL');
}

export async function withPrismaError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapPrismaError(error);
  }
}
