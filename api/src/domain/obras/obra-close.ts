import { VistoriaType } from '@prisma/client';

type ObraCloseSnapshot = {
  vistorias: { type: VistoriaType }[];
  custos: unknown[];
  purchaseOrders: unknown[];
};

export function getObraCloseBlockers(obra: ObraCloseSnapshot): string[] {
  const blockers: string[] = [];

  if (!obra.vistorias.some((v) => v.type === VistoriaType.INICIAL)) {
    blockers.push('Vistoria inicial não registrada');
  }
  if (!obra.vistorias.some((v) => v.type === VistoriaType.FINAL)) {
    blockers.push('Vistoria final não registrada');
  }

  return blockers;
}

export function getObraCloseWarnings(obra: ObraCloseSnapshot): string[] {
  const warnings: string[] = [];

  if (obra.custos.length === 0) {
    warnings.push('Nenhum custo lançado');
  }
  if (obra.purchaseOrders.length === 0) {
    warnings.push('Nenhuma ordem de compra (O.C.) emitida');
  }

  return warnings;
}
