import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@shared/lib/api';
import { Button } from '@shared/components/ui/Button';
import { Card } from '@shared/components/ui/Card';

type ConsentRequiredModalProps = {
  open: boolean;
  onAccepted: () => void;
};

export function ConsentRequiredModal({ open, onAccepted }: ConsentRequiredModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAccepted(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    if (!accepted) {
      setError('Aceite os Termos e a Política de Privacidade atualizados');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/consent');
      onAccepted();
    } catch {
      setError('Não foi possível registrar o consentimento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <h2 className="font-display text-xl font-semibold">Atualização legal</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Os Termos de Uso ou a Política de Privacidade foram atualizados. Leia e aceite para continuar.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1"
          />
          <span>
            Li e aceito os{' '}
            <Link to="/termos" target="_blank" className="text-brand hover:underline">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link to="/privacidade" target="_blank" className="text-brand hover:underline">
              Política de Privacidade
            </Link>
          </span>
        </label>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <Button className="mt-4 w-full" disabled={loading} onClick={handleSubmit}>
          {loading ? 'Salvando…' : 'Confirmar e continuar'}
        </Button>
      </Card>
    </div>
  );
}
