import type { AuthRequest } from '../../middleware/auth.js';

export interface RequestContext {
  userId: string;
  companyId: string;
  role: string;
  email: string;
}

export function getRequestContext(req: AuthRequest): RequestContext {
  if (!req.user || !req.companyId) {
    throw new Error('RequestContext requires authenticated user and companyId');
  }
  return {
    userId: req.user.userId,
    companyId: req.companyId,
    role: req.user.role,
    email: req.user.email,
  };
}
