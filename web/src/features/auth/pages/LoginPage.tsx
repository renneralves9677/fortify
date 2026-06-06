import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@shared/lib/api';
import { useAuthActions } from '@/stores/auth-store';
import { notify } from '@shared/lib/notify';
import { isValidEmail } from '@shared/lib/br-format';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { AuthLayout } from '@features/auth/components/AuthLayout';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthActions();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError('E-mail inválido');
      return;
    }
    setEmailError('');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.token, data.user, data.company);
      navigate('/inicio');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Credenciais inválidas';
      notify.error('Falha no login', { description: msg });
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse sua conta Fortify"
      footer={
        <>
          Não tem uma conta?{' '}
          <Link to="/criar-conta" className="font-medium text-brand hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          error={emailError}
          required
        />
        <div>
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="mt-1.5 text-right">
            <Link to="/esqueci-senha" className="text-sm text-brand hover:underline">
              Esqueci a senha
            </Link>
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
