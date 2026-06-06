import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import { ConsentGuard } from '@features/auth/components/ConsentGuard';
import { ShellBar } from '@shared/components/shell/ShellBar';
import { SideNav } from '@shared/components/shell/SideNav';

const COLLAPSE_KEY = 'fortify-sidenav-collapsed';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // close the mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ShellBar
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((v) => !v)}
        onOpenMobile={() => setMobileOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        {/* Desktop side nav */}
        <aside
          className={cn(
            'hidden shrink-0 flex-col border-r border-border bg-surface-elevated transition-[width] duration-200 md:flex',
            collapsed ? 'w-16' : 'w-60',
          )}
        >
          <SideNav collapsed={collapsed} />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface-elevated shadow-pop">
              <div className="flex h-12 items-center justify-between border-b border-border px-4">
                <span className="text-base font-semibold text-ink">Fortify</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fechar menu"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-muted hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>
              <SideNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto bg-surface">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
            <ConsentGuard>
              <Outlet />
            </ConsentGuard>
          </div>
        </main>
      </div>
    </div>
  );
}
