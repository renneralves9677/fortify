export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function parseCurrencyInput(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  return Number.parseFloat(normalized) || 0;
}

export function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = Number.parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrencyInputFromNumber(value: number): string {
  if (!value) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export const statusLabels: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  REVISAO: 'Em revisão',
  APROVACAO: 'Em aprovação',
  ENVIO: 'Pronto para envio',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  ASSINADO: 'Assinado',
  ATIVO: 'Ativo',
  VENCENDO: 'Vencendo',
  RENOVACAO: 'Renovação',
  ENCERRADO: 'Encerrado',
  ARQUIVADO: 'Arquivado',
  CANCELADO: 'Cancelado',
  EXPIRADO: 'Expirado',
  EXPIRED: 'Expirado',
  PENDENTE: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  WAITING: 'Aguardando',
  VIEWED: 'Visualizou',
  SIGNED: 'Assinado',
  DECLINED: 'Recusado',
  EMITIDA: 'Emitida',
  APROVADA: 'Aprovada',
  RECEBIDA_PARCIAL: 'Recebida parcial',
  RECEBIDA: 'Recebida',
  ativa: 'Ativa',
  encerrada: 'Encerrada',
};
