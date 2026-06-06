import { describe, it, expect } from 'vitest';
import { getLegalConfig, isConsentCurrent } from './legal.js';

describe('getLegalConfig', () => {
  it('returns default versions and dpo email', () => {
    const config = getLegalConfig();
    expect(config.termsVersion).toBeTruthy();
    expect(config.privacyVersion).toBeTruthy();
    expect(config.dpoEmail).toContain('@');
  });
});

describe('isConsentCurrent', () => {
  it('returns true when versions match env', () => {
    const config = getLegalConfig();
    expect(isConsentCurrent(config.termsVersion, config.privacyVersion)).toBe(true);
  });

  it('returns false when version differs', () => {
    expect(isConsentCurrent('0.1', '1.0')).toBe(false);
  });
});
