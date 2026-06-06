import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { AppError } from '../../core/errors/AppError.js';
import { AuthService } from './auth.service.js';

type AuthUserWithCompany = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  companyId: string;
  company: { id: string; name: string };
};

class FakeAuthRepository {
  constructor(private readonly user: AuthUserWithCompany | null) {}

  findByEmailWithCompany(_email: string, _companyId: string) {
    return Promise.resolve(this.user);
  }

  findFirstActiveByEmail(_email: string) {
    return Promise.resolve(this.user);
  }

  findByIdWithCompany(_userId: string) {
    return Promise.resolve(this.user ? { ...this.user, consent: null } : null);
  }

  findConsentByUserId(_userId: string) {
    return Promise.resolve(null);
  }

  upsertConsent(_userId: string) {
    return Promise.resolve({
      termsVersion: '1.0',
      privacyVersion: '1.0',
      acceptedAt: new Date(),
    });
  }

  refreshTokens: Array<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
  }> = [];

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    const row = { id: `rt-${this.refreshTokens.length + 1}`, userId, tokenHash, expiresAt, revokedAt: null };
    this.refreshTokens.push(row);
    return Promise.resolve(row);
  }

  findActiveRefreshTokenByHash(tokenHash: string) {
    const row = this.refreshTokens.find(
      (r) => r.tokenHash === tokenHash && !r.revokedAt && r.expiresAt > new Date(),
    );
    if (!row || !this.user) return Promise.resolve(null);
    return Promise.resolve({
      ...row,
      user: { ...this.user, active: true, deletedAt: null, consent: null, isOwner: false },
    });
  }

  rotateRefreshToken(oldId: string, userId: string, newTokenHash: string, expiresAt: Date) {
    const old = this.refreshTokens.find((r) => r.id === oldId);
    if (old) old.revokedAt = new Date();
    const row = {
      id: `rt-${this.refreshTokens.length + 1}`,
      userId,
      tokenHash: newTokenHash,
      expiresAt,
      revokedAt: null,
    };
    this.refreshTokens.push(row);
    return Promise.resolve(row);
  }

  revokeRefreshTokenByHash(tokenHash: string) {
    this.refreshTokens.forEach((r) => {
      if (r.tokenHash === tokenHash && !r.revokedAt) r.revokedAt = new Date();
    });
    return Promise.resolve({ count: 1 });
  }
}

const TEST_CNPJ = '11444777000161';

interface FakeVerification {
  id: string;
  email: string;
  name: string;
  companyName: string;
  companyCnpj: string;
  passwordHash: string;
  code: string;
  termsVersion: string;
  privacyVersion: string;
  expiresAt: Date;
  attempts: number;
  verifiedAt: Date | null;
  consumedAt: Date | null;
  createdAt: Date;
}

interface FakeReset {
  id: string;
  userId: string;
  email: string;
  code: string;
  token: string | null;
  expiresAt: Date;
  attempts: number;
  codeVerifiedAt: Date | null;
  consumedAt: Date | null;
  createdAt: Date;
}

class FakeSignupRepository {
  verifications: FakeVerification[] = [];
  resets: FakeReset[] = [];
  createdUser: AuthUserWithCompany | null = null;
  existingEmails = new Set<string>();
  existingCnpjs = new Set<string>();

  findCompanyByCnpj(cnpj: string) {
    return Promise.resolve(this.existingCnpjs.has(cnpj) ? ({ id: 'co-existing' } as never) : null);
  }

  createRefreshToken(_userId: string, _tokenHash: string, _expiresAt: Date) {
    return Promise.resolve({ id: 'rt-signup' });
  }

  findAnyByEmail(email: string) {
    return Promise.resolve(this.existingEmails.has(email) ? ({ id: 'x' } as never) : null);
  }

  createEmailVerification(data: Omit<FakeVerification, 'id' | 'attempts' | 'verifiedAt' | 'consumedAt' | 'createdAt'>) {
    const record: FakeVerification = {
      id: `v${this.verifications.length + 1}`,
      attempts: 0,
      verifiedAt: null,
      consumedAt: null,
      createdAt: new Date(),
      ...data,
    };
    this.verifications.push(record);
    return Promise.resolve(record);
  }

  findLatestEmailVerification(email: string) {
    const found = [...this.verifications]
      .filter((v) => v.email === email && !v.consumedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return Promise.resolve(found ?? null);
  }

  incrementVerificationAttempts(id: string) {
    const v = this.verifications.find((x) => x.id === id);
    if (v) v.attempts += 1;
    return Promise.resolve(v);
  }

  updateVerificationCode(id: string, code: string, expiresAt: Date) {
    const v = this.verifications.find((x) => x.id === id);
    if (v) {
      v.code = code;
      v.expiresAt = expiresAt;
      v.attempts = 0;
    }
    return Promise.resolve(v);
  }

  createAccountFromVerification(params: { verificationId: string; email: string; name: string; companyName: string }) {
    const v = this.verifications.find((x) => x.id === params.verificationId);
    if (v) v.consumedAt = new Date();
    this.createdUser = {
      id: 'newuser',
      name: params.name,
      email: params.email,
      passwordHash: 'hash',
      role: 'ADMIN',
      companyId: 'newco',
      company: { id: 'newco', name: params.companyName },
    };
    return Promise.resolve(this.createdUser);
  }

  // password reset
  findFirstActiveByEmail(email: string) {
    if (!this.existingEmails.has(email)) return Promise.resolve(null);
    return Promise.resolve({
      id: 'u1',
      name: 'Test',
      email,
      passwordHash: 'hash',
      role: 'ADMIN',
      companyId: 'c1',
      company: { id: 'c1', name: 'Demo' },
    } as never);
  }

  createPasswordReset(data: { userId: string; email: string; code: string; expiresAt: Date }) {
    const record: FakeReset = {
      id: `r${this.resets.length + 1}`,
      token: null,
      attempts: 0,
      codeVerifiedAt: null,
      consumedAt: null,
      createdAt: new Date(),
      ...data,
    };
    this.resets.push(record);
    return Promise.resolve(record);
  }

  findLatestPasswordReset(email: string) {
    const found = [...this.resets]
      .filter((r) => r.email === email && !r.consumedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return Promise.resolve(found ?? null);
  }

  incrementResetAttempts(id: string) {
    const r = this.resets.find((x) => x.id === id);
    if (r) r.attempts += 1;
    return Promise.resolve(r);
  }

  markResetCodeVerified(id: string, token: string, expiresAt: Date) {
    const r = this.resets.find((x) => x.id === id);
    if (r) {
      r.token = token;
      r.expiresAt = expiresAt;
      r.codeVerifiedAt = new Date();
    }
    return Promise.resolve(r);
  }

  findPasswordResetByToken(token: string) {
    return Promise.resolve(this.resets.find((r) => r.token === token) ?? null);
  }

  applyNewPassword(resetId: string, _userId: string, _passwordHash: string) {
    const r = this.resets.find((x) => x.id === resetId);
    if (r) r.consumedAt = new Date();
    return Promise.resolve();
  }
}

describe('AuthService — signup', () => {
  it('creates account when code matches', async () => {
    const repo = new FakeSignupRepository();
    const service = new AuthService(repo as never);
    await service.startSignup({
      name: 'Maria',
      companyName: 'Acme',
      companyCnpj: TEST_CNPJ,
      email: 'maria@acme.com',
      password: 'supersecret',
      acceptLegal: true,
    });
    const code = repo.verifications[0].code;
    const result = await service.verifySignup({ email: 'maria@acme.com', code });
    expect(result.body.token).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.body.user.email).toBe('maria@acme.com');
    expect(repo.verifications[0].consumedAt).toBeTruthy();
  });

  it('rejects signup when email already exists', async () => {
    const repo = new FakeSignupRepository();
    repo.existingEmails.add('taken@acme.com');
    const service = new AuthService(repo as never);
    await expect(
      service.startSignup({
        name: 'Maria',
        companyName: 'Acme',
        companyCnpj: TEST_CNPJ,
        email: 'taken@acme.com',
        password: 'supersecret',
        acceptLegal: true,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects wrong code and increments attempts', async () => {
    const repo = new FakeSignupRepository();
    const service = new AuthService(repo as never);
    await service.startSignup({
      name: 'Maria',
      companyName: 'Acme',
      companyCnpj: TEST_CNPJ,
      email: 'maria@acme.com',
      password: 'supersecret',
      acceptLegal: true,
    });
    await expect(
      service.verifySignup({ email: 'maria@acme.com', code: '000000' }),
    ).rejects.toBeInstanceOf(AppError);
    expect(repo.verifications[0].attempts).toBe(1);
  });

  it('rejects expired code', async () => {
    const repo = new FakeSignupRepository();
    const service = new AuthService(repo as never);
    await service.startSignup({
      name: 'Maria',
      companyName: 'Acme',
      companyCnpj: TEST_CNPJ,
      email: 'maria@acme.com',
      password: 'supersecret',
      acceptLegal: true,
    });
    repo.verifications[0].expiresAt = new Date(Date.now() - 1000);
    const code = repo.verifications[0].code;
    await expect(
      service.verifySignup({ email: 'maria@acme.com', code }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('AuthService — password reset', () => {
  it('does not reveal missing email and stays silent', async () => {
    const repo = new FakeSignupRepository();
    const service = new AuthService(repo as never);
    const result = await service.forgotPassword({ email: 'ghost@acme.com' });
    expect(result.message).toBeTruthy();
    expect(repo.resets).toHaveLength(0);
  });

  it('full reset flow succeeds', async () => {
    const repo = new FakeSignupRepository();
    repo.existingEmails.add('user@acme.com');
    const service = new AuthService(repo as never);
    await service.forgotPassword({ email: 'user@acme.com' });
    const code = repo.resets[0].code;
    await service.verifyResetCode({ email: 'user@acme.com', code });
    const token = repo.resets[0].token!;
    expect(token).toBeTruthy();
    const result = await service.resetPassword({ token, password: 'newpassword1' });
    expect(result.message).toBeTruthy();
    expect(repo.resets[0].consumedAt).toBeTruthy();
  });

  it('rejects invalid reset token', async () => {
    const repo = new FakeSignupRepository();
    const service = new AuthService(repo as never);
    await expect(
      service.resetPassword({ token: 'does-not-exist', password: 'newpassword1' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('AuthService', () => {
  it('throws INVALID_CREDENTIALS when password does not match', async () => {
    const hash = await bcrypt.hash('secret123', 10);
    const user: AuthUserWithCompany = {
      id: 'u1',
      name: 'Test',
      email: 'test@demo.fortify.local',
      passwordHash: hash,
      role: 'ADMIN',
      companyId: 'c1',
      company: { id: 'c1', name: 'Demo' },
    };

    const service = new AuthService(new FakeAuthRepository(user) as never);

    await expect(
      service.loginWithPassword({
        email: user.email,
        password: 'wrong',
        acceptLegal: true,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('returns token on valid login with acceptLegal', async () => {
    const password = 'secret123';
    const hash = await bcrypt.hash(password, 10);
    const user: AuthUserWithCompany = {
      id: 'u1',
      name: 'Test',
      email: 'test@demo.fortify.local',
      passwordHash: hash,
      role: 'ADMIN',
      companyId: 'c1',
      company: { id: 'c1', name: 'Demo' },
    };

    const service = new AuthService(new FakeAuthRepository(user) as never);
    const result = await service.loginWithPassword({
      email: user.email,
      password,
      acceptLegal: true,
    });

    expect(result.body.token).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.body.consent.isCurrent).toBe(true);
  });

  it('rotates refresh token and returns new access token', async () => {
    const password = 'secret123';
    const hash = await bcrypt.hash(password, 10);
    const user: AuthUserWithCompany = {
      id: 'u1',
      name: 'Test',
      email: 'test@demo.fortify.local',
      passwordHash: hash,
      role: 'ADMIN',
      companyId: 'c1',
      company: { id: 'c1', name: 'Demo' },
    };

    const repo = new FakeAuthRepository(user);
    const service = new AuthService(repo as never);
    const login = await service.loginWithPassword({
      email: user.email,
      password,
      acceptLegal: true,
    });

    const refreshed = await service.refreshSession(login.refreshToken);
    expect(refreshed.body.token).toBeTruthy();
    expect(refreshed.refreshToken).not.toBe(login.refreshToken);
    expect(repo.refreshTokens.filter((r) => r.revokedAt)).toHaveLength(1);
  });
});
