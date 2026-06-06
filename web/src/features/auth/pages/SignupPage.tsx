import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@shared/lib/api';
import { useAuthActions } from '@/stores/auth-store';
import { notify, extractErrorMessage } from '@shared/lib/notify';
import { formatCnpj, isValidCnpj, isValidEmail, normalizeCnpj } from '@shared/lib/br-format';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { AuthLayout } from '@features/auth/components/AuthLayout';

type Step = 'form' | 'code';

export default function SignupPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthActions();
  const [step, setStep] = useState<Step>('form');

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptLegal, setAcceptLegal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  function validateForm() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Informe seu nome';
    if (companyName.trim().length < 2) next.companyName = 'Informe o nome da empresa';
    if (!isValidCnpj(companyCnpj)) next.companyCnpj = 'CNPJ inválido';
    if (!isValidEmail(email)) next.email = 'E-mail inválido';
    if (password.length < 8) next.password = 'Mínimo de 8 caracteres';
    if (confirmPassword !== password) next.confirmPassword = 'As senhas não coincidem';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleStartSignup(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!acceptLegal) {
      setFormError('Aceite os Termos de Uso e a Política de Privacidade');
      return;
    }
    if (!validateForm()) return;
    setLoading(true);
    try {
      await api.post('/auth/signup', {
        name: name.trim(),
        companyName: companyName.trim(),
        companyCnpj: normalizeCnpj(companyCnpj),
        email: email.trim().toLowerCase(),
        password,
        acceptLegal: true,
      });
      notify.success('Código enviado', { description: 'Verifique seu e-mail' });
      setStep('code');
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setCodeError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError('Informe o código de 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup/verify', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      setAuth(data.token, data.user, data.company);
      notify.success('Conta criada com sucesso');
      navigate('/inicio');
    } catch (err) {
      setCodeError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.post('/auth/signup/resend', { email: email.trim().toLowerCase() });
      notify.info('Novo código enviado');
    } catch (err) {
      notify.fromError(err, 'Não foi possível reenviar o código');
    } finally {
      setResending(false);
    }
  }

  if (step === 'code') {
    return (
      <AuthLayout
        title="Confirme seu e-mail"
        subtitle={`Enviamos um código de 6 dígitos para ${email}`}
        footer={
          <button
            type="button"
            onClick={() => setStep('form')}
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
          >
            <ArrowLeft size={14} /> Alterar dados
          </button>
        }
      >
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            label="Código de confirmação"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              if (codeError) setCodeError('');
            }}
            error={codeError}
            className="text-center text-lg tracking-[0.5em]"
            autoFocus
          />
          <Button type="submit" className="w-full" loading={loading}>
            Confirmar e criar conta
          </Button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full text-sm text-ink-muted hover:text-brand disabled:opacity-50"
          >
            {resending ? 'Reenviando…' : 'Reenviar código'}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Comece a usar a Fortify gratuitamente"
      footer={
        <>
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleStartSignup} className="space-y-4">
        <Input
          label="Seu nome"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
        />
        <Input
          label="Nome da empresa"
          autoComplete="organization"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          error={errors.companyName}
          required
        />
        <Input
          label="CNPJ da empresa"
          inputMode="numeric"
          autoComplete="off"
          placeholder="00.000.000/0000-00"
          value={companyCnpj}
          onChange={(e) => setCompanyCnpj(formatCnpj(e.target.value))}
          error={errors.companyCnpj}
          required
        />
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <Input
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          required
        />
        <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={acceptLegal}
            onChange={(e) => setAcceptLegal(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--palette-brand)]"
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
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
