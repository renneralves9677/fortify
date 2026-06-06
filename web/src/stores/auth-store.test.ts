import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth-store';

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      company: null,
      companyId: null,
    });
  });

  it('setAuth stores token, user and company', () => {
    useAuthStore.getState().setAuth(
      'jwt-token',
      { id: 'u1', name: 'Admin', email: 'admin@test.local', role: 'ADMIN' },
      { id: 'c1', name: 'Demo Co' },
    );

    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt-token');
    expect(state.user?.email).toBe('admin@test.local');
    expect(state.companyId).toBe('c1');
  });

  it('setToken updates only the access token', () => {
    useAuthStore.getState().setAuth(
      'old-token',
      { id: 'u1', name: 'Admin', email: 'admin@test.local', role: 'ADMIN' },
      { id: 'c1', name: 'Demo Co' },
    );
    useAuthStore.getState().setToken('new-token');
    expect(useAuthStore.getState().token).toBe('new-token');
    expect(useAuthStore.getState().user?.email).toBe('admin@test.local');
  });

  it('logout clears session', () => {
    useAuthStore.getState().setAuth(
      'jwt-token',
      { id: 'u1', name: 'Admin', email: 'admin@test.local', role: 'ADMIN' },
      { id: 'c1', name: 'Demo Co' },
    );
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.companyId).toBeNull();
  });
});
