import {
  LayoutDashboard,
  FileText,
  FileStack,
  PenLine,
  HardHat,
  BarChart3,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: 'Geral',
    items: [{ to: '/inicio', label: 'Início', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Contratos',
    items: [
      { to: '/contratos', label: 'Contratos', icon: FileText },
      { to: '/contratos/assinaturas', label: 'Assinaturas', icon: PenLine },
    ],
  },
  {
    label: 'Modelos',
    items: [{ to: '/contratos/templates', label: 'Templates', icon: FileStack }],
  },
  {
    label: 'Operações',
    items: [{ to: '/obras', label: 'Obras', icon: HardHat }],
  },
  {
    label: 'Relatórios',
    items: [{ to: '/relatorios', label: 'Relatórios', icon: BarChart3 }],
  },
  {
    label: 'Administração',
    items: [
      { to: '/configuracoes', label: 'Configuração', icon: Settings },
      { to: '/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
    ],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

const CONTRACTS_SUBSECTIONS = new Set(['assinaturas', 'templates']);

function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.end) return pathname === item.to;
  if (pathname === item.to) return true;
  if (!pathname.startsWith(`${item.to}/`)) return false;

  if (item.to === '/contratos') {
    const subsection = pathname.slice('/contratos/'.length).split('/')[0];
    return !CONTRACTS_SUBSECTIONS.has(subsection);
  }

  return true;
}

/** Best-match nav item for a given pathname (longest matching `to`). */
export function matchNavItem(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of allNavItems) {
    if (isNavItemActive(pathname, item)) {
      if (!best || item.to.length > best.to.length) best = item;
    }
  }
  return best;
}
