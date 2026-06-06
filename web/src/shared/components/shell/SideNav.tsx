import { Link, useLocation } from 'react-router-dom';
import { cn } from '@shared/lib/cn';
import { matchNavItem, navGroups } from '@shared/lib/nav';
import { useIsAdmin } from '@/stores/auth-store';

type SideNavProps = {
  collapsed: boolean;
  onNavigate?: () => void;
};

export function SideNav({ collapsed, onNavigate }: SideNavProps) {
  const isAdmin = useIsAdmin();
  const { pathname } = useLocation();
  const activeTo = matchNavItem(pathname)?.to;

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navegação principal">
      {navGroups.map((group) => {
        const items = group.items.filter((item) => !item.adminOnly || isAdmin);
        if (items.length === 0) return null;

        return (
          <div key={group.label} className="mb-4 last:mb-0">
            {!collapsed && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                {group.label}
              </p>
            )}
            {collapsed && <div className="mx-2 mb-2 h-px bg-border" aria-hidden />}
            <ul className="space-y-0.5">
              {items.map(({ to, label, icon: Icon }) => {
                const isActive = activeTo === to;

                return (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? label : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-accent font-medium text-brand'
                          : 'text-ink-muted hover:bg-muted hover:text-ink',
                      )}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-brand"
                          aria-hidden
                        />
                      )}
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
