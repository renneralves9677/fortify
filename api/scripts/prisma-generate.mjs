import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const maxAttempts = 4;
const retryDelayMs = 3000;

function isLockError(output) {
  return /EPERM|operation not permitted|EBUSY/i.test(output);
}

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const result = spawnSync('npx', ['prisma', 'generate'], {
    cwd: apiRoot,
    encoding: 'utf8',
    shell: true,
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.status === 0) {
    if (output.trim()) process.stdout.write(output);
    process.exit(0);
  }

  if (!isLockError(output) || attempt === maxAttempts) {
    if (output.trim()) process.stderr.write(output);
    if (isLockError(output)) {
      console.error('\nPrisma generate bloqueado no Windows (arquivo em uso).');
      console.error('Pare o servidor da API (npm run dev), feche o Prisma Studio e tente de novo.\n');
    }
    process.exit(result.status ?? 1);
  }

  console.warn(`Prisma generate: arquivo em uso (tentativa ${attempt}/${maxAttempts}). Aguardando ${retryDelayMs / 1000}s...`);
  await sleep(retryDelayMs);
}
