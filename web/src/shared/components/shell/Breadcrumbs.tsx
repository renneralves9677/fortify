import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { allNavItems, matchNavItem } from '@shared/lib/nav';

const SEGMENT_LABELS: Record<string, string> = {
  contratos: 'Contratos',
  assinaturas: 'Assinaturas',
  templates: 'Templates',
  novo: 'Novo contrato',
  gerenciador: 'Gerenciador',
  obras: 'Obras',
  relatorios: 'Relatórios',
  configuracoes: 'Configuração',
  usuarios: 'Usuários',
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/inicio') return null;

  const current = matchNavItem(pathname);
  const segments = pathname.split('/').filter(Boolean);

  const crumbs: { label: string; to?: string }[] = [{ label: 'Início', to: '/inicio' }];

  let acc = '';
  segments.forEach((seg, idx) => {
    acc += `/${seg}`;
    const navMatch = allNavItems.find((n) => n.to === acc);
    const isLast = idx === segments.length - 1;
    let label = navMatch?.label ?? SEGMENT_LABELS[seg];
    if (seg === 'novo' && segments[idx - 1] === 'templates') label = 'Novo template';
    if (!label) {
      // dynamic id segment — use the matched section name or a generic label
      label = isLast ? current?.label ?? 'Detalhe' : seg;
    }
    crumbs.push({ label, to: isLast ? undefined : acc });
  });

  return (
    <nav aria-label="Trilha" className="flex items-center gap-1 text-xs text-ink-muted">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-ink-subtle" />}
          {c.to ? (
            <Link to={c.to} className="transition-colors hover:text-brand">
              {c.label}
            </Link>
          ) : (
            <span className="font-medium text-ink">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
