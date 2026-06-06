import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware } from '../../middleware/auth.js';
import { authModerateLimiter, authStrictLimiter } from '../../middleware/rate-limit.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

const router = Router();

router.post(
  '/login',
  authStrictLimiter,
  asyncHandler((req, res) => authController.login(req, res)),
);

router.post(
  '/refresh',
  authModerateLimiter,
  asyncHandler((req, res) => authController.refresh(req, res)),
);

router.post(
  '/logout',
  asyncHandler((req, res) => authController.logout(req, res)),
);

router.post(
  '/signup',
  authStrictLimiter,
  asyncHandler((req, res) => authController.signup(req, res)),
);

router.post(
  '/signup/verify',
  authStrictLimiter,
  asyncHandler((req, res) => authController.signupVerify(req, res)),
);

router.post(
  '/signup/resend',
  authModerateLimiter,
  asyncHandler((req, res) => authController.signupResend(req, res)),
);

router.post(
  '/forgot-password',
  authStrictLimiter,
  asyncHandler((req, res) => authController.forgotPassword(req, res)),
);

router.post(
  '/reset/verify-code',
  authStrictLimiter,
  asyncHandler((req, res) => authController.verifyResetCode(req, res)),
);

router.post(
  '/reset-password',
  authStrictLimiter,
  asyncHandler((req, res) => authController.resetPassword(req, res)),
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler((req, res) => authController.me(req, res)),
);

router.post(
  '/consent',
  authMiddleware,
  asyncHandler((req, res) => authController.consent(req, res)),
);

export default router;
