import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { ThemeToggle } from '@shared/components/shell/ThemeToggle';

const brandHighlights = [
  'Contratos, assinaturas e obras em um só lugar',
  'Assinatura eletrônica com trilha de auditoria',
];

/**
 * Split-screen layout shared by all auth surfaces (login, signup, password reset).
 * Left: Fortify brand panel. Right: form card with optional footer.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-12 text-on-brand lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(50% 40% at 80% 0%, oklch(100% 0 0 / 0.25), transparent)',
          }}
          aria-hidden
        />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-on-brand/20 text-base font-bold">
            F
          </span>
          <span className="text-2xl font-semibold tracking-tight">Fortify</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Contratos, obras e orçamento em uma plataforma.
          </h2>
          <ul className="mt-8 space-y-3">
            {brandHighlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-on-brand-muted">
                <Check size={18} /> {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-on-brand-muted">
          © {new Date().getFullYear()} Fortify
        </p>
      </div>

      <div className="relative flex flex-col items-center justify-center bg-surface p-6 sm:p-8">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-base font-bold text-on-brand">
              F
            </span>
            <span className="text-xl font-semibold tracking-tight text-ink">Fortify</span>
          </Link>
          <div className="rounded-card border border-border bg-card p-6 shadow-card sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
