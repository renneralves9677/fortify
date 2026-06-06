import { prisma } from '../../core/database/prisma.js';
import { getLegalConfig, isConsentCurrent } from '../../core/config/legal.js';

export class PrivacyRepository {
  findUserPrivacyProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { company: true, consent: true },
    });
  }

  findAuditLogsForUser(userId: string, companyId: string) {
    return prisma.auditLog.findMany({
      where: { userId, companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
    });
  }
}

export function mapConsentRecord(
  consent: { termsVersion: string; privacyVersion: string; acceptedAt: Date } | null,
) {
  if (!consent) return null;
  return {
    termsVersion: consent.termsVersion,
    privacyVersion: consent.privacyVersion,
    acceptedAt: consent.acceptedAt,
    isCurrent: isConsentCurrent(consent.termsVersion, consent.privacyVersion),
  };
}

export function getPrivacyConfig() {
  return getLegalConfig();
}
