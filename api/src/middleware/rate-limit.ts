import type { Request, RequestHandler, Response } from 'express';
import rateLimit, {
  ipKeyGenerator,
  type Options,
  type RateLimitRequestHandler,
} from 'express-rate-limit';
import { getRateLimitConfig } from '../core/config/rate-limit.js';

type CreateRateLimiterOptions = Partial<Options> & {
  max: number;
  windowMs: number;
  /** Allows unit tests to exercise the limiter while VITEST is set. */
  ignoreVitest?: boolean;
};

function resolveClientIp(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress;
  if (!ip) {
    return '';
  }
  return ip;
}

function rateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
    code: 'RATE_LIMITED',
  });
}

function noopMiddleware(_req: Request, _res: Response, next: () => void): void {
  next();
}

export function createRateLimiter(options: CreateRateLimiterOptions): RequestHandler {
  const { ignoreVitest, ...rateLimitOptions } = options;
  const config = getRateLimitConfig();
  if (!config.enabled || (process.env.VITEST && !ignoreVitest)) {
    return noopMiddleware;
  }

  const limiter: RateLimitRequestHandler = rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => !resolveClientIp(req),
    keyGenerator: (req) => ipKeyGenerator(resolveClientIp(req)),
    ...rateLimitOptions,
  });

  return limiter;
}

const config = getRateLimitConfig();

export const globalRateLimiter = createRateLimiter({
  max: config.global.max,
  windowMs: config.global.windowMs,
  skip: (req) => req.path === '/health',
});

export const authStrictLimiter = createRateLimiter({
  max: config.authStrict.max,
  windowMs: config.authStrict.windowMs,
});

export const authModerateLimiter = createRateLimiter({
  max: config.authModerate.max,
  windowMs: config.authModerate.windowMs,
});

export const signatureOtpLimiter = createRateLimiter({
  max: config.signatureOtp.max,
  windowMs: config.signatureOtp.windowMs,
  keyGenerator: (req) => {
    const token = req.params.token ?? '';
    return `${ipKeyGenerator(resolveClientIp(req))}:${token}`;
  },
});

export const uploadRateLimiter = createRateLimiter({
  max: config.upload.max,
  windowMs: config.upload.windowMs,
});
