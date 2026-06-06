import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@shared/lib/api';
import { notify, extractErrorMessage } from '@shared/lib/notify';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { AuthLayout } from '@features/auth/components/AuthLayout';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('A senha deve ter ao menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      notify.success('Senha redefinida com sucesso');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Link inválido"
        subtitle="O link de redefinição é inválido ou expirou."
        footer={
          <Link to="/esqueci-senha" className="font-medium text-brand hover:underline">
            Solicitar novo link
          </Link>
        }
      >
        <p className="text-sm text-ink-muted">
          Volte para a tela de recuperação e solicite um novo código.
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Senha redefinida">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 size={26} />
          </span>
          <p className="text-sm text-ink-muted">
            Sua senha foi atualizada. Você já pode entrar com a nova senha.
          </p>
          <Button className="w-full" onClick={() => navigate('/login')}>
            Ir para o login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Definir nova senha" subtitle="Escolha uma nova senha para sua conta">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError('');
          }}
          required
        />
        <Input
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (error) setError('');
          }}
          error={error}
          required
        />
        <Button type="submit" className="w-full" loading={loading}>
          Redefinir senha
        </Button>
      </form>
    </AuthLayout>
  );
}
