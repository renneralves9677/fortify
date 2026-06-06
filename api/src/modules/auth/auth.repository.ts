import { UserRole } from '@prisma/client';
import { prisma } from '../../core/database/prisma.js';
import { getLegalConfig } from '../../core/config/legal.js';
import { provisionDefaultTemplates } from '../templates/templates-provision.repository.js';

export class AuthRepository {
  findByEmailWithCompany(email: string, companyId: string) {
    return prisma.user.findFirst({
      where: { companyId, email, active: true, deletedAt: null },
      include: { company: true },
    });
  }

  findFirstActiveByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, active: true, deletedAt: null },
      include: { company: true },
    });
  }

  findAnyByEmail(email: string) {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  // --- Signup (email verification) ---

  findCompanyByCnpj(cnpj: string) {
    return prisma.company.findUnique({ where: { cnpj } });
  }

  createEmailVerification(data: {
    email: string;
    name: string;
    companyName: string;
    companyCnpj: string;
    passwordHash: string;
    code: string;
    termsVersion: string;
    privacyVersion: string;
    expiresAt: Date;
  }) {
    return prisma.emailVerification.create({ data });
  }

  findLatestEmailVerification(email: string) {
    return prisma.emailVerification.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  incrementVerificationAttempts(id: string) {
    return prisma.emailVerification.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  updateVerificationCode(id: string, code: string, expiresAt: Date) {
    return prisma.emailVerification.update({
      where: { id },
      data: { code, expiresAt, attempts: 0 },
    });
  }

  /** Creates company + admin user + consent atomically and consumes the verification. */
  async createAccountFromVerification(params: {
    verificationId: string;
    email: string;
    name: string;
    companyName: string;
    companyCnpj: string;
    passwordHash: string;
    termsVersion: string;
    privacyVersion: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: params.companyName, cnpj: params.companyCnpj },
      });
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: params.email,
          passwordHash: params.passwordHash,
          name: params.name,
          role: UserRole.SUPER_ADMIN,
          isOwner: true,
        },
        include: { company: true },
      });
      await tx.userConsent.create({
        data: {
          userId: user.id,
          termsVersion: params.termsVersion,
          privacyVersion: params.privacyVersion,
        },
      });
      await tx.emailVerification.update({
        where: { id: params.verificationId },
        data: { verifiedAt: new Date(), consumedAt: new Date() },
      });
      await provisionDefaultTemplates(company.id, tx);
      return user;
    });
  }

  // --- Password reset ---

  createPasswordReset(data: { userId: string; email: string; code: string; expiresAt: Date }) {
    return prisma.passwordReset.create({ data });
  }

  findLatestPasswordReset(email: string) {
    return prisma.passwordReset.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  incrementResetAttempts(id: string) {
    return prisma.passwordReset.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  markResetCodeVerified(id: string, token: string, expiresAt: Date) {
    return prisma.passwordReset.update({
      where: { id },
      data: { codeVerifiedAt: new Date(), token, expiresAt },
    });
  }

  findPasswordResetByToken(token: string) {
    return prisma.passwordReset.findUnique({ where: { token } });
  }

  async applyNewPassword(resetId: string, userId: string, passwordHash: string) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.passwordReset.update({
        where: { id: resetId },
        data: { consumedAt: new Date() },
      });
    });
  }

  findByIdWithCompany(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { company: true, consent: true },
    });
  }

  findConsentByUserId(userId: string) {
    return prisma.userConsent.findUnique({ where: { userId } });
  }

  upsertConsent(userId: string) {
    const { termsVersion, privacyVersion } = getLegalConfig();
    return prisma.userConsent.upsert({
      where: { userId },
      update: { termsVersion, privacyVersion },
      create: { userId, termsVersion, privacyVersion },
    });
  }

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  findActiveRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { include: { company: true, consent: true } },
      },
    });
  }

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  rotateRefreshToken(oldId: string, userId: string, newTokenHash: string, expiresAt: Date) {
    return prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: oldId },
        data: { revokedAt: new Date() },
      });
      return tx.refreshToken.create({
        data: { userId, tokenHash: newTokenHash, expiresAt },
      });
    });
  }
}
