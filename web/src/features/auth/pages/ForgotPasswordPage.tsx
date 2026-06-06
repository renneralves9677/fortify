import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { api } from '@shared/lib/api';
import { notify, extractErrorMessage } from '@shared/lib/notify';
import { isValidEmail } from '@shared/lib/br-format';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { AuthLayout } from '@features/auth/components/AuthLayout';

type Step = 'email' | 'code' | 'done';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('E-mail inválido');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      notify.info('Se o e-mail existir, enviaremos um código');
      setStep('code');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Informe o código de 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset/verify-code', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      setStep('done');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const backToLogin = (
    <Link to="/login" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
      <ArrowLeft size={14} /> Voltar para o login
    </Link>
  );

  if (step === 'done') {
    return (
      <AuthLayout title="Verifique seu e-mail" footer={backToLogin}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <MailCheck size={26} />
          </span>
          <p className="text-sm text-ink-muted">
            Enviamos um link para <span className="font-medium text-ink">{email}</span>. Abra o e-mail
            e clique no botão para definir uma nova senha. O link expira em 30 minutos.
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'code') {
    return (
      <AuthLayout
        title="Digite o código"
        subtitle={`Enviamos um código de 6 dígitos para ${email}`}
        footer={backToLogin}
      >
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <Input
            label="Código de verificação"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              if (error) setError('');
            }}
            error={error}
            className="text-center text-lg tracking-[0.5em]"
            autoFocus
          />
          <Button type="submit" className="w-full" loading={loading}>
            Validar código
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Esqueci a senha"
      subtitle="Informe seu e-mail para receber um código de verificação"
      footer={backToLogin}
    >
      <form onSubmit={handleRequestCode} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          error={error}
          required
        />
        <Button type="submit" className="w-full" loading={loading}>
          Enviar código
        </Button>
      </form>
    </AuthLayout>
  );
}
