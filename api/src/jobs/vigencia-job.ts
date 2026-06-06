import { processVigenciaAlerts } from '../modules/contracts/contracts-vigencia.job.js';

export async function runVigenciaAlertsJob(): Promise<{ created: number }> {
  const created = await processVigenciaAlerts();
  return { created };
}
