import { ContractStatus } from '@prisma/client';
import { prisma } from '../../core/database/prisma.js';
import { findContractsNeedingAlerts } from '../../domain/contracts/vigencia-alerts.js';

/** Daily job: records D-90 through D-7 alerts for active contracts. */
export async function processVigenciaAlerts(): Promise<number> {
  const contracts = await prisma.contract.findMany({
    where: {
      status: { in: [ContractStatus.ATIVO, ContractStatus.VENCENDO, ContractStatus.ASSINADO] },
      endDate: { not: null },
    },
    select: { id: true, title: true, endDate: true },
  });

  const candidates = findContractsNeedingAlerts(contracts);
  let created = 0;

  for (const candidate of candidates) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await prisma.vigenciaAlert.findFirst({
      where: {
        contractId: candidate.contractId,
        daysBefore: candidate.daysBefore,
        sentAt: { gte: todayStart },
      },
    });

    if (existing) continue;

    await prisma.vigenciaAlert.create({
      data: {
        contractId: candidate.contractId,
        daysBefore: candidate.daysBefore,
        actionTaken: null,
      },
    });
    created++;
  }

  return created;
}
