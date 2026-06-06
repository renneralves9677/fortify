const BR_TIMEZONE = 'America/Sao_Paulo';

function brDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BR_TIMEZONE }).format(date);
}

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
  return new Intl.DateTimeFormat('pt-BR', { timeZone: BR_TIMEZONE }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BR_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Data/hora legível: "Hoje, 22:37:32" quando o evento é do dia atual (horário de Brasília). */
export function formatDateTimeHuman(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  const now = new Date();
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BR_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);

  const dayKey = brDayKey(date);
  if (dayKey === brDayKey(now)) return `Hoje, ${time}`;

  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey === brDayKey(yesterday)) return `Ontem, ${time}`;

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BR_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
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
