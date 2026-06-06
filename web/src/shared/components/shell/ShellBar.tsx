import { Link, useLocation } from 'react-router-dom';
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import { matchNavItem } from '@shared/lib/nav';
import { UserMenu } from './UserMenu';

type ShellBarProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
};

export function ShellBar({ collapsed, onToggleSidebar, onOpenMobile }: ShellBarProps) {
  const { pathname } = useLocation();
  const current = matchNavItem(pathname);
  const title = current?.label ?? 'Fortify';

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-surface-elevated px-3">
      {/* Desktop collapse toggle */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="hidden h-9 w-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-muted hover:text-ink md:inline-flex"
      >
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {/* Mobile drawer toggle */}
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Abrir menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-muted hover:text-ink md:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Branding */}
      <div className="flex items-center gap-2.5">
        <Link to="/inicio" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-on-brand">
            F
          </span>
          <span className="text-base font-semibold tracking-tight text-ink">Fortify</span>
        </Link>
        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
        <span className={cn('hidden text-sm text-ink-muted sm:block')}>{title}</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <UserMenu />
      </div>
    </header>
  );
}
