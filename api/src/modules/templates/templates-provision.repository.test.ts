import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provisionDefaultTemplates } from './templates-provision.repository.js';

function createPrismaMock() {
  const templates: Array<{ id: string; companyId: string; name: string }> = [];
  let fieldCounter = 0;

  return {
    contractTemplate: {
      findFirst: vi.fn(async ({ where }: { where: { companyId: string; name: string } }) =>
        templates.find((t) => t.companyId === where.companyId && t.name === where.name) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: { companyId: string; name: string } }) => {
        const row = { id: `tpl-${++fieldCounter}`, companyId: data.companyId, name: data.name };
        templates.push(row);
        return row;
      }),
      update: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = templates.find((t) => t.id === where.id);
        if (!row) throw new Error('not found');
        return row;
      }),
    },
    contractTemplateField: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    _templates: templates,
  };
}

describe('provisionDefaultTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates missing default templates for a company', async () => {
    const prisma = createPrismaMock();
    const result = await provisionDefaultTemplates('co-1', prisma as never);
    expect(result.created).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.templates).toHaveLength(3);
    expect(prisma._templates).toHaveLength(3);
  });

  it('skips templates that already exist', async () => {
    const prisma = createPrismaMock();
    await provisionDefaultTemplates('co-1', prisma as never);
    const second = await provisionDefaultTemplates('co-1', prisma as never);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(3);
  });
});
