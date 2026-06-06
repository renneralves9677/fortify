import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { AppError } from '../../core/errors/AppError.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from '../../core/auth/refresh-token.js';
import { getLegalConfig, isConsentCurrent } from '../../core/config/legal.js';
import { sendMail } from '../../core/email/mailer.js';
import {
  resetCodeEmail,
  resetLinkEmail,
  signupCodeEmail,
} from '../../core/email/templates.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  ResendCodeInput,
  ResetPasswordInput,
  SignupInput,
  SignupVerifyInput,
  VerifyResetCodeInput,
} from './auth.schema.js';
import { AuthRepository } from './auth.repository.js';

const CODE_TTL_MS = 15 * 60 * 1000;
const RESET_LINK_TTL_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function webUrl(): string {
  return process.env.WEB_URL ?? 'http://localhost:5173';
}

function buildConsentPayload(consent: {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: Date;
} | null) {
  if (!consent) {
    return {
      termsVersion: null,
      privacyVersion: null,
      acceptedAt: null,
      isCurrent: false,
      consentRequired: true,
    };
  }
  const isCurrent = isConsentCurrent(consent.termsVersion, consent.privacyVersion);
  return {
    termsVersion: consent.termsVersion,
    privacyVersion: consent.privacyVersion,
    acceptedAt: consent.acceptedAt,
    isCurrent,
    consentRequired: !isCurrent,
  };
}

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async loginWithPassword(input: LoginInput) {
    const user = input.companyId
      ? await this.authRepository.findByEmailWithCompany(input.email, input.companyId)
      : await this.authRepository.findFirstActiveByEmail(input.email);

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError(401, 'Credenciais inválidas', 'INVALID_CREDENTIALS');
    }

    const consent = await this.authRepository.upsertConsent(user.id);
    return this.createSession(user, consent);
  }

  async getCurrentUser(userId: string) {
    const user = await this.authRepository.findByIdWithCompany(userId);
    if (!user) {
      throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
    }
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isOwner: user.isOwner,
      },
      company: { id: user.company.id, name: user.company.name },
      consent: buildConsentPayload(user.consent),
      legal: getLegalConfig(),
    };
  }

  async recordConsent(userId: string) {
    const consent = await this.authRepository.upsertConsent(userId);
    return {
      consent: buildConsentPayload(consent),
      legal: getLegalConfig(),
    };
  }

  private async createSession(
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      isOwner: boolean;
      companyId: string;
      company: { id: string; name: string };
    },
    consent: { termsVersion: string; privacyVersion: string; acceptedAt: Date } | null,
  ) {
    const accessToken = signAccessToken({
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken();
    await this.authRepository.createRefreshToken(
      user.id,
      hashRefreshToken(refreshToken),
      refreshTokenExpiresAt(),
    );
    return {
      refreshToken,
      body: {
        token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isOwner: user.isOwner,
        },
        company: { id: user.company.id, name: user.company.name },
        consent: buildConsentPayload(consent),
        legal: getLegalConfig(),
      },
    };
  }

  async refreshSession(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new AppError(401, 'Sessão expirada', 'REFRESH_INVALID');
    }
    const stored = await this.authRepository.findActiveRefreshTokenByHash(
      hashRefreshToken(rawRefreshToken),
    );
    if (!stored || !stored.user.active || stored.user.deletedAt) {
      throw new AppError(401, 'Sessão expirada', 'REFRESH_INVALID');
    }

    const newRefreshToken = generateRefreshToken();
    await this.authRepository.rotateRefreshToken(
      stored.id,
      stored.userId,
      hashRefreshToken(newRefreshToken),
      refreshTokenExpiresAt(),
    );

    const accessToken = signAccessToken({
      userId: stored.user.id,
      companyId: stored.user.companyId,
      email: stored.user.email,
      role: stored.user.role,
    });

    return {
      refreshToken: newRefreshToken,
      body: { token: accessToken },
    };
  }

  async revokeSession(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;
    await this.authRepository.revokeRefreshTokenByHash(hashRefreshToken(rawRefreshToken));
  }

  // --- Criação de conta com confirmação por e-mail ---

  async startSignup(input: SignupInput) {
    const existing = await this.authRepository.findAnyByEmail(input.email);
    if (existing) {
      throw new AppError(409, 'Já existe uma conta com este e-mail', 'EMAIL_ALREADY_USED');
    }

    const companyWithCnpj = await this.authRepository.findCompanyByCnpj(input.companyCnpj);
    if (companyWithCnpj) {
      throw new AppError(409, 'Já existe uma empresa com este CNPJ', 'CNPJ_ALREADY_USED');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const code = generateCode();
    const legal = getLegalConfig();
    await this.authRepository.createEmailVerification({
      email: input.email,
      name: input.name,
      companyName: input.companyName,
      companyCnpj: input.companyCnpj,
      passwordHash,
      code,
      termsVersion: legal.termsVersion,
      privacyVersion: legal.privacyVersion,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    const mail = signupCodeEmail(input.name, code);
    await sendMail({ to: input.email, subject: mail.subject, html: mail.html });

    return { email: input.email, message: 'Código de confirmação enviado para o seu e-mail' };
  }

  async resendSignupCode(input: ResendCodeInput) {
    const verification = await this.authRepository.findLatestEmailVerification(input.email);
    if (!verification) {
      throw new AppError(404, 'Nenhuma solicitação de cadastro encontrada', 'VERIFICATION_NOT_FOUND');
    }
    const code = generateCode();
    await this.authRepository.updateVerificationCode(
      verification.id,
      code,
      new Date(Date.now() + CODE_TTL_MS),
    );
    const mail = signupCodeEmail(verification.name, code);
    await sendMail({ to: input.email, subject: mail.subject, html: mail.html });
    return { email: input.email, message: 'Novo código enviado' };
  }

  async verifySignup(input: SignupVerifyInput) {
    const verification = await this.authRepository.findLatestEmailVerification(input.email);
    if (!verification) {
      throw new AppError(404, 'Nenhuma solicitação de cadastro encontrada', 'VERIFICATION_NOT_FOUND');
    }
    if (verification.expiresAt < new Date()) {
      throw new AppError(400, 'Código expirado. Solicite um novo.', 'CODE_EXPIRED');
    }
    if (verification.attempts >= MAX_ATTEMPTS) {
      throw new AppError(429, 'Muitas tentativas. Solicite um novo código.', 'TOO_MANY_ATTEMPTS');
    }
    if (verification.code !== input.code) {
      await this.authRepository.incrementVerificationAttempts(verification.id);
      throw new AppError(400, 'Código incorreto', 'CODE_INVALID');
    }

    const existing = await this.authRepository.findAnyByEmail(input.email);
    if (existing) {
      throw new AppError(409, 'Já existe uma conta com este e-mail', 'EMAIL_ALREADY_USED');
    }

    const companyWithCnpj = await this.authRepository.findCompanyByCnpj(verification.companyCnpj);
    if (companyWithCnpj) {
      throw new AppError(409, 'Já existe uma empresa com este CNPJ', 'CNPJ_ALREADY_USED');
    }

    const user = await this.authRepository.createAccountFromVerification({
      verificationId: verification.id,
      email: verification.email,
      name: verification.name,
      companyName: verification.companyName,
      companyCnpj: verification.companyCnpj,
      passwordHash: verification.passwordHash,
      termsVersion: verification.termsVersion,
      privacyVersion: verification.privacyVersion,
    });

    return this.createSession(user, {
      termsVersion: verification.termsVersion,
      privacyVersion: verification.privacyVersion,
      acceptedAt: new Date(),
    });
  }

  // --- Recuperação de senha ---

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.authRepository.findFirstActiveByEmail(input.email);
    // Resposta uniforme: não revela se o e-mail existe.
    if (!user) {
      return { message: 'Se o e-mail existir, enviaremos um código de verificação' };
    }
    const code = generateCode();
    await this.authRepository.createPasswordReset({
      userId: user.id,
      email: user.email,
      code,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    const mail = resetCodeEmail(code);
    await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
    return { message: 'Se o e-mail existir, enviaremos um código de verificação' };
  }

  async verifyResetCode(input: VerifyResetCodeInput) {
    const reset = await this.authRepository.findLatestPasswordReset(input.email);
    if (!reset || reset.expiresAt < new Date()) {
      throw new AppError(400, 'Código inválido ou expirado', 'RESET_CODE_INVALID');
    }
    if (reset.attempts >= MAX_ATTEMPTS) {
      throw new AppError(429, 'Muitas tentativas. Solicite um novo código.', 'TOO_MANY_ATTEMPTS');
    }
    if (reset.code !== input.code) {
      await this.authRepository.incrementResetAttempts(reset.id);
      throw new AppError(400, 'Código incorreto', 'RESET_CODE_INVALID');
    }

    const token = randomUUID();
    await this.authRepository.markResetCodeVerified(
      reset.id,
      token,
      new Date(Date.now() + RESET_LINK_TTL_MS),
    );
    const link = `${webUrl()}/redefinir-senha?token=${token}`;
    const mail = resetLinkEmail(link);
    await sendMail({ to: reset.email, subject: mail.subject, html: mail.html });
    return { message: 'Enviamos um link para você definir a nova senha' };
  }

  async resetPassword(input: ResetPasswordInput) {
    const reset = await this.authRepository.findPasswordResetByToken(input.token);
    if (!reset || reset.consumedAt || !reset.codeVerifiedAt || reset.expiresAt < new Date()) {
      throw new AppError(400, 'Link inválido ou expirado', 'RESET_TOKEN_INVALID');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    await this.authRepository.applyNewPassword(reset.id, reset.userId, passwordHash);
    return { message: 'Senha redefinida com sucesso' };
  }
}
