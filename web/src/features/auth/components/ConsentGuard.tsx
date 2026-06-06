import { useEffect, useState } from 'react';
import { api } from '@shared/lib/api';
import { ConsentRequiredModal } from '../components/ConsentRequiredModal';

type ConsentState = {
  consentRequired: boolean;
};

export function ConsentGuard({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(null);

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setConsent({ consentRequired: data.consent?.consentRequired ?? false });
      })
      .catch(() => setConsent({ consentRequired: false }));
  }, []);

  if (consent === null) return children;

  return (
    <>
      {children}
      <ConsentRequiredModal
        open={consent.consentRequired}
        onAccepted={() => setConsent({ consentRequired: false })}
      />
    </>
  );
}
