import { AppError } from '../../core/errors/AppError.js';
import {
  PrivacyRepository,
  getPrivacyConfig,
  mapConsentRecord,
} from './privacy.repository.js';

export class PrivacyService {
  constructor(private readonly privacyRepository: PrivacyRepository) {}

  async getPrivacyMe(userId: string) {
    const user = await this.privacyRepository.findUserPrivacyProfile(userId);
    if (!user) {
      throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
    }
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      company: { id: user.company.id, name: user.company.name },
      consent: mapConsentRecord(user.consent),
      dpoEmail: getPrivacyConfig().dpoEmail,
    };
  }

  getPrivacyConfig() {
    return getPrivacyConfig();
  }

  async exportUserData(userId: string, companyId: string) {
    const user = await this.privacyRepository.findUserPrivacyProfile(userId);
    if (!user || user.companyId !== companyId) {
      throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
    }

    const auditLogs = await this.privacyRepository.findAuditLogsForUser(userId, companyId);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      company: { id: user.company.id, name: user.company.name },
      consent: mapConsentRecord(user.consent),
      auditLogs,
    };
  }
}
