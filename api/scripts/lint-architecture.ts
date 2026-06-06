/**
 * Architecture guardrails — run via `npm run lint:arch`.
 * Fails on layer violations documented in AGENTS.md.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../src');

/** Temporary allowlist — shrink as violations are fixed. */
const PRISMA_IN_SERVICE_ALLOWLIST = new Set<string>([]);

const PRISMA_IN_DOMAIN_ALLOWLIST = new Set([
  'domain/obras/obra-report-images.ts',
]);

const MAX_LINES_ALLOWLIST = new Set([
  'modules/signatures/signatures.repository.ts',
  'modules/contracts/contracts.service.ts',
  'modules/auth/auth.service.ts',
  'modules/templates/templates.service.ts',
  'domain/obras/obra-report.ts',
]);

const MAX_LINES = 300;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) acc.push(full);
  }
  return acc;
}

function rel(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

const violations: string[] = [];

for (const file of walk(ROOT)) {
  const r = rel(file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').length;

  if (
    (r.startsWith('modules/') || r.startsWith('domain/')) &&
    lines > MAX_LINES &&
    !MAX_LINES_ALLOWLIST.has(r)
  ) {
    violations.push(`${r}: ${lines} lines (max ${MAX_LINES})`);
  }

  const importsPrismaClient =
    /from\s+['"][^'"]*\/database\/prisma(?:\.js)?['"]/.test(content) ||
    /import\s*\{\s*prisma\s*\}/.test(content);

  if (r.endsWith('.service.ts') && importsPrismaClient && !PRISMA_IN_SERVICE_ALLOWLIST.has(r)) {
    violations.push(`${r}: imports prisma client (only allowed in *.repository.ts)`);
  }

  if (r.startsWith('domain/') && importsPrismaClient && !PRISMA_IN_DOMAIN_ALLOWLIST.has(r)) {
    violations.push(`${r}: domain must not import prisma client`);
  }

  if (r.endsWith('.controller.ts') && /res\.status\([^)]+\)\.json\(\s*\{\s*error/.test(content)) {
    violations.push(`${r}: controller must throw AppError, not res.status().json({ error })`);
  }
}

if (violations.length > 0) {
  console.error('Architecture lint failed:\n');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('Architecture lint passed.');
