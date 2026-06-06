import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError.js';
import { fromZodError } from './zod-mapper.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    const mapped = fromZodError(err);
    res.status(mapped.statusCode).json({
      error: mapped.message,
      code: mapped.code,
      details: mapped.details,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: 'Erro interno. Tente novamente.',
    code: 'INTERNAL',
  });
}
