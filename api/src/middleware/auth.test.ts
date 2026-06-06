import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import { authMiddleware, requireAdmin, requireRole, type AuthRequest } from './auth.js';
import { signToken } from '../core/auth/jwt.js';
import { AppError } from '../core/errors/AppError.js';

function mockRes() {
  return {} as Response;
}

function mockNext() {
  return vi.fn() as NextFunction & { mock: { calls: unknown[][] } };
}

describe('authMiddleware', () => {
  let next: ReturnType<typeof mockNext>;

  beforeEach(() => {
    next = mockNext();
  });

  it('calls next with UNAUTHORIZED when token is missing', () => {
    const req = { headers: {} } as AuthRequest;
    authMiddleware(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).code).toBe('UNAUTHORIZED');
  });

  it('sets user and companyId from valid token', () => {
    const token = signToken({
      userId: 'u1',
      companyId: 'c1',
      email: 'a@b.com',
      role: 'ADMIN',
    });
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    authMiddleware(req, mockRes(), next);
    expect(req.user?.userId).toBe('u1');
    expect(req.companyId).toBe('c1');
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with FORBIDDEN when X-Company-Id differs from token', () => {
    const token = signToken({
      userId: 'u1',
      companyId: 'c1',
      email: 'a@b.com',
      role: 'ADMIN',
    });
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-company-id': 'other-company',
      },
    } as unknown as AuthRequest;
    authMiddleware(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).code).toBe('FORBIDDEN');
  });
});

describe('requireRole', () => {
  it('blocks when role is not allowed', () => {
    const req = { user: { role: 'VIEWER' } } as AuthRequest;
    const next = mockNext();
    requireRole('ADMIN')(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(403);
  });

  it('allows when role matches', () => {
    const req = { user: { role: 'ADMIN' } } as AuthRequest;
    const next = mockNext();
    requireRole('ADMIN', 'OPERATOR')(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireAdmin', () => {
  it('allows SUPER_ADMIN and ADMIN', () => {
    const next = mockNext();
    requireAdmin({ user: { role: 'SUPER_ADMIN' } } as AuthRequest, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
    next.mockClear();
    requireAdmin({ user: { role: 'ADMIN' } } as AuthRequest, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks VIEWER', () => {
    const next = mockNext();
    requireAdmin({ user: { role: 'VIEWER' } } as AuthRequest, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(403);
  });
});
