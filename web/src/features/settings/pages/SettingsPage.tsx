import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@shared/lib/api';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Card } from '@shared/components/ui/Card';
import { AppearanceSetting } from '@features/settings/components/AppearanceSetting';

type PrivacyMe = {
  user: { name: string; email: string; role: string; createdAt: string };
  company: { name: string };
  consent: {
    termsVersion: string | null;
    privacyVersion: string | null;
    acceptedAt: string | null;
    isCurrent: boolean;
  } | null;
  dpoEmail: string;
};

export default function SettingsPage() {
  const [data, setData] = useState<PrivacyMe | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<PrivacyMe>('/privacy/me')
      .then(({ data: payload }) => setData(payload))
      .catch(() => setError('Não foi possível carregar dados de privacidade'));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Configuração" description="Configurações do sistema" />

      <Card>
        <AppearanceSetting />
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold">Centro de privacidade</h2>
        <p className="mt-1 text-sm text-ink-muted">Seus direitos como titular de dados (LGPD Art. 18).</p>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        {data && (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Nome</dt>
              <dd>{data.user.name}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">E-mail</dt>
              <dd>{data.user.email}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Empresa</dt>
              <dd>{data.company.name}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Cadastro</dt>
              <dd>{new Date(data.user.createdAt).toLocaleDateString('pt-BR')}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Consentimento</dt>
              <dd>
                {data.consent?.acceptedAt
                  ? `${new Date(data.consent.acceptedAt).toLocaleDateString('pt-BR')} (v. ${data.consent.termsVersion}/${data.consent.privacyVersion})`
                  : 'Não registrado'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">DPO</dt>
              <dd>
                <a href={`mailto:${data.dpoEmail}`} className="text-brand hover:underline">
                  {data.dpoEmail}
                </a>
              </dd>
            </div>
          </dl>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/termos" className="text-sm text-brand hover:underline">
            Termos de Uso
          </Link>
          <Link to="/privacidade" className="text-sm text-brand hover:underline">
            Política de Privacidade
          </Link>
        </div>
      </Card>
    </div>
  );
}
