import { extractErrorMessage } from '@shared/lib/notify';

export function isNotFoundError(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
}

export function getQueryErrorMessage(error: unknown, fallback = 'Erro inesperado'): string {
  return extractErrorMessage(error) || fallback;
}
