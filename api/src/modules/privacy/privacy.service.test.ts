import { describe, it, expect } from 'vitest';
import { PrivacyService } from './privacy.service.js';

class FakePrivacyRepository {
  async findUserPrivacyProfile(_userId: string) {
    return {
      id: 'u1',
      name: 'Test User',
      email: 'test@demo.fortify.local',
      role: 'ADMIN',
      companyId: 'c1',
      createdAt: new Date('2025-01-01'),
      company: { id: 'c1', name: 'Demo Co' },
      consent: {
        termsVersion: '1.0',
        privacyVersion: '1.0',
        acceptedAt: new Date('2025-01-02'),
      },
    };
  }

  async findAuditLogsForUser(_userId: string, _companyId: string) {
    return [{ action: 'LOGIN', entityType: 'User', entityId: 'u1', createdAt: new Date() }];
  }
}

describe('PrivacyService', () => {
  const service = new PrivacyService(new FakePrivacyRepository() as never);

  it('exportUserData never includes password fields', async () => {
    const data = await service.exportUserData('u1', 'c1');
    const json = JSON.stringify(data);
    expect(json).not.toContain('password');
    expect(json).not.toContain('passwordHash');
    expect(data.profile.email).toBe('test@demo.fortify.local');
    expect(data.auditLogs).toHaveLength(1);
  });

  it('getPrivacyMe returns user and company', async () => {
    const data = await service.getPrivacyMe('u1');
    expect(data.user.name).toBe('Test User');
    expect(data.dpoEmail).toBeTruthy();
  });
});
