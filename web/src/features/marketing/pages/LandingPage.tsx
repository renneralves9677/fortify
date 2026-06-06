import { Link } from 'react-router-dom';
import {
  FileText,
  PenLine,
  HardHat,
  BarChart3,
  ArrowRight,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@shared/components/ui/Button';

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: FileText,
    title: 'Contratos com ciclo completo',
    description:
      'Crie a partir de templates, controle vigência, versões e aprovações em um único fluxo rastreável.',
  },
  {
    icon: PenLine,
    title: 'Assinatura eletrônica',
    description:
      'Envie para múltiplos signatários por e-mail ou WhatsApp, com consentimento, OTP e trilha de auditoria.',
  },
  {
    icon: HardHat,
    title: 'Gestão de obras',
    description:
      'Roteiro de etapas, vistorias, custos e ordens de compra vinculados ao contrato assinado.',
  },
  {
    icon: BarChart3,
    title: 'Indicadores e relatórios',
    description: 'Painel executivo com KPIs de contratos, obras e exportações em CSV.',
  },
];

const highlights = [
  'Contratos, assinaturas e obras em uma plataforma',
  'Trilha de auditoria e rastreabilidade ponta a ponta',
  'Tema claro e escuro com identidade Fortify',
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <header className="sticky top-0 z-30 border-b border-border bg-surface-elevated/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-on-brand">
              F
            </span>
            <span className="text-lg font-semibold tracking-tight">Fortify</span>
          </div>
          <div className="flex-1" />
          <Link to="/login">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link to="/criar-conta">
            <Button size="sm">Criar conta</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(60% 50% at 50% -10%, var(--effect-glow-brand), transparent)',
            }}
            aria-hidden
          />
          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-medium text-ink-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Plataforma de contratos e obras
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Contratos, assinaturas e obras{' '}
                <span className="text-brand">em uma só plataforma</span>
              </h1>
              <p className="mt-4 max-w-xl text-base text-ink-muted sm:text-lg">
                Centralize a criação de contratos, a assinatura eletrônica e o acompanhamento de obras
                com rastreabilidade completa.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/criar-conta">
                  <Button size="lg">
                    Criar conta grátis <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary" size="lg">Já tenho conta</Button>
                </Link>
              </div>
              <ul className="mt-8 space-y-2">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-ink-muted">
                    <Check size={16} className="text-success" /> {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="rounded-tile border border-border bg-card p-5 shadow-pop">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs font-bold text-on-brand">
                      F
                    </span>
                    <span className="text-sm font-semibold">Painel Fortify</span>
                  </div>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-brand">
                    Demonstração
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Contratos ativos', value: '128' },
                    { label: 'Assinaturas pendentes', value: '12' },
                    { label: 'Obras em execução', value: '34' },
                    { label: 'Custo acompanhado', value: 'R$ 4,2M' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-card border border-border bg-surface p-3">
                      <p className="text-xs text-ink-muted">{kpi.label}</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {['Contrato de obra — Construtora Alfa', 'Locação comercial — Loja Centro'].map((row) => (
                    <div
                      key={row}
                      className="flex items-center justify-between rounded-control border border-border bg-surface px-3 py-2 text-sm"
                    >
                      <span className="truncate">{row}</span>
                      <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium">Assinado</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Tudo que sua operação precisa
            </h2>
            <p className="mt-3 text-ink-muted">
              Do rascunho do contrato à entrega da obra, com governança e auditoria em cada etapa.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-card border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-control bg-accent text-brand">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-surface-elevated">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 py-14 text-center sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pronto para começar?
            </h2>
            <p className="max-w-xl text-ink-muted">
              Crie sua conta em minutos e leve seus contratos e obras para um fluxo único e rastreável.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/criar-conta">
                <Button size="lg">
                  Criar conta <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">Entrar</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Fortify. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/termos" className="hover:text-brand">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-brand">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
