import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { isAdminRole, isSuperAdminRole } from '@shared/lib/roles';

type User = { id: string; name: string; email: string; role: string; isOwner?: boolean };
type Company = { id: string; name: string };

type AuthState = {
  token: string | null;
  user: User | null;
  company: Company | null;
  companyId: string | null;
  setAuth: (token: string, user: User, company: Company) => void;
  setToken: (token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      company: null,
      companyId: null,
      setAuth: (token, user, company) =>
        set({ token, user, company, companyId: company.id }),
      setToken: (token) => set({ token }),
      logout: () => set({ token: null, user: null, company: null, companyId: null }),
    }),
    { name: 'fortify-auth' },
  ),
);

export const useUser = () => useAuthStore((s) => s.user);
export const useToken = () => useAuthStore((s) => s.token);
export const useIsAdmin = () => useAuthStore((s) => isAdminRole(s.user?.role));
export const useIsSuperAdmin = () => useAuthStore((s) => isSuperAdminRole(s.user?.role));
export const useIsOwner = () => useAuthStore((s) => Boolean(s.user?.isOwner));
export const useAuthActions = () =>
  useAuthStore(useShallow((s) => ({ setAuth: s.setAuth, setToken: s.setToken, logout: s.logout })));
