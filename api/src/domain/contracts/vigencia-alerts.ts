const ALERT_THRESHOLDS = [90, 60, 30, 15, 7] as const;

export interface VigenciaAlertCandidate {
  contractId: string;
  title: string;
  daysBefore: number;
  endDate: Date;
}

export function findContractsNeedingAlerts(
  contracts: Array<{ id: string; title: string; endDate: Date | null }>,
  now = new Date(),
): VigenciaAlertCandidate[] {
  const candidates: VigenciaAlertCandidate[] = [];

  for (const contract of contracts) {
    if (!contract.endDate) continue;

    const daysRemaining = Math.ceil(
      (contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    for (const threshold of ALERT_THRESHOLDS) {
      if (daysRemaining <= threshold && daysRemaining > 0) {
        candidates.push({
          contractId: contract.id,
          title: contract.title,
          daysBefore: threshold,
          endDate: contract.endDate,
        });
      }
    }
  }

  return candidates;
}
