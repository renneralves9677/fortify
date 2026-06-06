const FIFTEEN_MINUTES_MS = 15 * 60_000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type RateLimitWindow = {
  max: number;
  windowMs: number;
};

export type RateLimitConfig = {
  enabled: boolean;
  trustProxy: boolean;
  global: RateLimitWindow;
  authStrict: RateLimitWindow;
  authModerate: RateLimitWindow;
  signatureOtp: RateLimitWindow;
  upload: RateLimitWindow;
};

export function getRateLimitConfig(): RateLimitConfig {
  const windowMs = envInt('RATE_LIMIT_WINDOW_MS', FIFTEEN_MINUTES_MS);

  return {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    trustProxy: process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production',
    global: {
      max: envInt('RATE_LIMIT_GLOBAL_MAX', 300),
      windowMs,
    },
    authStrict: {
      max: envInt('RATE_LIMIT_AUTH_MAX', 10),
      windowMs,
    },
    authModerate: {
      max: envInt('RATE_LIMIT_AUTH_MODERATE_MAX', 30),
      windowMs,
    },
    signatureOtp: {
      max: envInt('RATE_LIMIT_SIGNATURE_OTP_MAX', 5),
      windowMs,
    },
    upload: {
      max: envInt('RATE_LIMIT_UPLOAD_MAX', 20),
      windowMs,
    },
  };
}
