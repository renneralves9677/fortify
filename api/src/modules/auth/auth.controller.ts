import type { Request, Response } from 'express';
import { parseBody } from '../../core/errors/zod-mapper.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from '../../core/auth/refresh-token.js';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  forgotPasswordSchema,
  loginSchema,
  resendCodeSchema,
  resetPasswordSchema,
  signupSchema,
  signupVerifySchema,
  verifyResetCodeSchema,
} from './auth.schema.js';
import type { AuthService } from './auth.service.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private sendSession(
    res: Response,
    session: { refreshToken: string; body: Record<string, unknown> },
  ): void {
    setRefreshCookie(res, session.refreshToken);
    res.json(session.body);
  }

  async login(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(loginSchema, req.body);
    const session = await this.authService.loginWithPassword(input);
    this.sendSession(res, session);
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const raw = readRefreshCookie(req);
    const session = await this.authService.refreshSession(raw ?? '');
    setRefreshCookie(res, session.refreshToken);
    res.json(session.body);
  }

  async logout(req: Request, res: Response): Promise<void> {
    await this.authService.revokeSession(readRefreshCookie(req));
    clearRefreshCookie(res);
    res.json({ message: 'Logout realizado' });
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.authService.getCurrentUser(req.user!.userId);
    res.json(result);
  }

  async consent(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.authService.recordConsent(req.user!.userId);
    res.json(result);
  }

  async signup(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(signupSchema, req.body);
    const result = await this.authService.startSignup(input);
    res.status(201).json(result);
  }

  async signupVerify(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(signupVerifySchema, req.body);
    const session = await this.authService.verifySignup(input);
    this.sendSession(res, session);
  }

  async signupResend(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(resendCodeSchema, req.body);
    const result = await this.authService.resendSignupCode(input);
    res.json(result);
  }

  async forgotPassword(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(forgotPasswordSchema, req.body);
    const result = await this.authService.forgotPassword(input);
    res.json(result);
  }

  async verifyResetCode(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(verifyResetCodeSchema, req.body);
    const result = await this.authService.verifyResetCode(input);
    res.json(result);
  }

  async resetPassword(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(resetPasswordSchema, req.body);
    const result = await this.authService.resetPassword(input);
    res.json(result);
  }
}
