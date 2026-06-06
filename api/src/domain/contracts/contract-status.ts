/** Domain contract lifecycle status (mirrors DB enum without Prisma dependency). */
export type ContractLifecycleStatus =
  | 'RASCUNHO'
  | 'REVISAO'
  | 'APROVACAO'
  | 'ENVIO'
  | 'AGUARDANDO_ASSINATURA'
  | 'ASSINADO'
  | 'ATIVO'
  | 'VENCENDO'
  | 'ENCERRADO';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeContractStatus(
  status: ContractLifecycleStatus,
  endDate: Date | null,
): ContractLifecycleStatus {
  if (status === 'ASSINADO') {
    return 'ATIVO';
  }
  if ((status === 'ATIVO' || status === 'VENCENDO') && endDate) {
    const now = new Date();
    const days = Math.ceil((endDate.getTime() - now.getTime()) / MS_PER_DAY);
    if (days < 0) return 'ENCERRADO';
    if (days <= 30) return 'VENCENDO';
    return 'ATIVO';
  }
  return status;
}

export function daysUntil(endDate: Date | null): number | null {
  if (!endDate) return null;
  return Math.ceil((endDate.getTime() - Date.now()) / MS_PER_DAY);
}
