import { toast } from 'sonner';

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { error?: string; message?: string } } }).response;
    return res?.data?.error ?? res?.data?.message ?? 'Erro inesperado';
  }
  if (error instanceof Error) return error.message;
  return 'Erro inesperado';
}

export const notify = {
  success(message: string, options?: { description?: string }) {
    toast.success(message, { description: options?.description });
  },
  error(message: string, options?: { description?: string }) {
    toast.error(message, { description: options?.description });
  },
  info(message: string, options?: { description?: string }) {
    toast.info(message, { description: options?.description });
  },
  fromError(error: unknown, fallback = 'Erro inesperado') {
    toast.error(fallback, { description: extractErrorMessage(error) });
  },
};

export { extractErrorMessage };
