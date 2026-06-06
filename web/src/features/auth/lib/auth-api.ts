import { api } from '@shared/lib/api';

export async function logoutSession() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Cookie pode já estar ausente; limpar sessão local mesmo assim.
  }
}
