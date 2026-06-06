export function getLegalConfig() {
  return {
    termsVersion: process.env.LEGAL_TERMS_VERSION ?? '1.0',
    privacyVersion: process.env.LEGAL_PRIVACY_VERSION ?? '1.0',
    dpoEmail: process.env.DPO_EMAIL ?? 'privacidade@fortify.local',
  };
}

export function isConsentCurrent(termsVersion: string, privacyVersion: string): boolean {
  const config = getLegalConfig();
  return termsVersion === config.termsVersion && privacyVersion === config.privacyVersion;
}
