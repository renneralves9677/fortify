import type { Response, NextFunction } from 'express';
import { AppError } from '../core/errors/AppError.js';
import type { AuthRequest } from './auth.js';

export function tenantMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.companyId) {
    return next(new AppError(400, 'companyId obrigatório', 'COMPANY_REQUIRED'));
  }
  next();
}
