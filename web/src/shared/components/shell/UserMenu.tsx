import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, ChevronDown } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import { useAuthStore, useAuthActions } from '@/stores/auth-store';
import { logoutSession } from '@features/auth/lib/auth-api';
import { ThemeToggle } from './ThemeToggle';

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-control py-1 pl-1 pr-2 text-sm transition-colors hover:bg-muted',
          open && 'bg-muted',
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-on-brand">
          {initials(user?.name)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-ink sm:inline">{user?.name}</span>
        <ChevronDown size={14} className="hidden text-ink-muted sm:inline" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-card border border-border bg-popover shadow-pop"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
            <p className="truncate text-xs text-ink-muted">{user?.email}</p>
            {company?.name && (
              <p className="mt-1 truncate text-xs text-ink-subtle">{company.name}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <span className="text-sm text-ink-muted">Aparência</span>
            <ThemeToggle />
          </div>

          <div className="p-1">
            <Link
              to="/configuracoes"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-control px-3 py-2 text-sm text-ink transition-colors hover:bg-muted"
            >
              <Settings size={16} className="text-ink-muted" />
              Configuração
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await logoutSession();
                logout();
                navigate('/login');
              }}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
