import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from './jwt.js';

describe('jwt', () => {
  const payload = {
    userId: 'user-1',
    companyId: 'company-1',
    email: 'test@demo.fortify.local',
    role: 'ADMIN',
  };

  it('signs and verifies a token', () => {
    const token = signToken(payload);
    expect(verifyToken(token)).toMatchObject(payload);
  });

  it('rejects invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });
});
