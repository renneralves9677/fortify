import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../core/auth/jwt.js';
import { AppError } from '../core/errors/AppError.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
  companyId?: string;
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token ausente', 'UNAUTHORIZED'));
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.user = payload;
    const headerCompany = req.headers['x-company-id'] as string | undefined;
    req.companyId = headerCompany ?? payload.companyId;
    if (req.companyId !== payload.companyId) {
      return next(new AppError(403, 'Empresa não autorizada', 'FORBIDDEN'));
    }
    next();
  } catch {
    next(new AppError(401, 'Token inválido', 'INVALID_TOKEN'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Permissão negada', 'FORBIDDEN'));
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');
