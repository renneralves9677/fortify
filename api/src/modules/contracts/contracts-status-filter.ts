import { ContractStatus, type Prisma } from '@prisma/client';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Maps list filter status to Prisma where clause (infrastructure layer only). */
export function buildContractStatusFilter(status: ContractStatus): Prisma.ContractWhereInput {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * MS_PER_DAY);

  switch (status) {
    case ContractStatus.ATIVO:
      return {
        OR: [
          { status: ContractStatus.ASSINADO },
          {
            status: { in: [ContractStatus.ATIVO, ContractStatus.VENCENDO] },
            OR: [{ endDate: null }, { endDate: { gt: in30Days } }],
          },
        ],
      };
    case ContractStatus.VENCENDO:
      return {
        status: { in: [ContractStatus.ATIVO, ContractStatus.VENCENDO] },
        endDate: { gte: now, lte: in30Days },
      };
    case ContractStatus.ENCERRADO:
      return {
        OR: [
          { status: ContractStatus.ENCERRADO },
          {
            status: { in: [ContractStatus.ATIVO, ContractStatus.VENCENDO] },
            endDate: { lt: now },
          },
        ],
      };
    default:
      return { status };
  }
}
