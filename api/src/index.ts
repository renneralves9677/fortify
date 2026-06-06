import 'dotenv/config';
import { createApp } from './app.js';
import { runVigenciaAlertsJob } from './jobs/vigencia-job.js';

const app = createApp();
const port = Number(process.env.API_PORT ?? 3001);

if (!process.env.VITEST) {
  app.listen(port, () => {
    console.log(`Fortify API http://localhost:${port}`);
    runVigenciaAlertsJob()
      .then((r) => console.log(`Vigência: ${r.created} alerta(s) processado(s)`))
      .catch(() => undefined);
    setInterval(
      () => {
        runVigenciaAlertsJob().catch(() => undefined);
      },
      24 * 60 * 60 * 1000,
    );
  });
}

export default app;
