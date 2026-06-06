import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRateLimitConfig } from './rate-limit.js';

describe('getRateLimitConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns defaults when env vars are unset', () => {
    delete process.env.RATE_LIMIT_ENABLED;
    delete process.env.RATE_LIMIT_GLOBAL_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;

    const config = getRateLimitConfig();

    expect(config.enabled).toBe(true);
    expect(config.global.max).toBe(300);
    expect(config.global.windowMs).toBe(900_000);
    expect(config.authStrict.max).toBe(10);
  });

  it('reads overrides from env', () => {
    process.env.RATE_LIMIT_ENABLED = 'false';
    process.env.RATE_LIMIT_AUTH_MAX = '5';
    process.env.TRUST_PROXY = '1';

    const config = getRateLimitConfig();

    expect(config.enabled).toBe(false);
    expect(config.authStrict.max).toBe(5);
    expect(config.trustProxy).toBe(true);
  });
});
