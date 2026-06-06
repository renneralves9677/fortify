import type { Response, NextFunction } from 'express';
import { prisma } from '../core/database/prisma.js';
import type { AuthRequest } from './auth.js';

export function auditMiddleware(action: string, entityType?: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode < 400 && req.companyId) {
        void prisma.auditLog.create({
          data: {
            companyId: req.companyId,
            userId: req.user?.userId,
            action,
            entityType,
            entityId: typeof body === 'object' && body && 'id' in body ? String((body as { id: string }).id) : undefined,
            metadata: { method: req.method, path: req.path },
          },
        });
      }
      return originalJson(body);
    };
    next();
  };
}

export async function logAudit(
  companyId: string,
  userId: string | undefined,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: object,
  beforeValue?: object,
  afterValue?: object,
) {
  await prisma.auditLog.create({
    data: { companyId, userId, action, entityType, entityId, metadata, beforeValue, afterValue },
  });
}
