import { describe, it, expect, vi } from 'vitest';
import type { Response, NextFunction } from 'express';
import { tenantMiddleware } from './tenant.js';
import type { AuthRequest } from './auth.js';
import { AppError } from '../core/errors/AppError.js';

describe('tenantMiddleware', () => {
  it('calls next with COMPANY_REQUIRED when companyId is missing', () => {
    const req = {} as AuthRequest;
    const next = vi.fn() as NextFunction;

    tenantMiddleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).code).toBe('COMPANY_REQUIRED');
  });

  it('calls next when companyId is set', () => {
    const req = { companyId: 'company-1' } as AuthRequest;
    const next = vi.fn() as NextFunction;

    tenantMiddleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
