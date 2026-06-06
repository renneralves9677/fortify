import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { notify, extractErrorMessage } from './notify';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success calls toast.success', () => {
    notify.success('Salvo');
    expect(toast.success).toHaveBeenCalledWith('Salvo', { description: undefined });
  });

  it('error calls toast.error with description', () => {
    notify.error('Falha', { description: 'Detalhe' });
    expect(toast.error).toHaveBeenCalledWith('Falha', { description: 'Detalhe' });
  });

  it('fromError extracts API message', () => {
    const err = { response: { data: { error: 'Campo inválido' } } };
    notify.fromError(err, 'Erro');
    expect(toast.error).toHaveBeenCalledWith('Erro', { description: 'Campo inválido' });
  });
});

describe('extractErrorMessage', () => {
  it('returns message from axios-like error', () => {
    expect(extractErrorMessage({ response: { data: { message: 'Não encontrado' } } })).toBe('Não encontrado');
  });

  it('returns Error message', () => {
    expect(extractErrorMessage(new Error('timeout'))).toBe('timeout');
  });

  it('fallback for unknown', () => {
    expect(extractErrorMessage(null)).toBe('Erro inesperado');
  });
});
