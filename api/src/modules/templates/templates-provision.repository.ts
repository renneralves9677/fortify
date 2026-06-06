import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../core/database/prisma.js';
import { DEFAULT_CONTRACT_TEMPLATES } from '../../domain/contracts/default-templates.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export type ProvisionResult = {
  created: number;
  updated: number;
  skipped: number;
  templates: Array<{ id: string; name: string }>;
};

export async function provisionDefaultTemplates(
  companyId: string,
  client: DbClient = prisma,
  options?: { updateExisting?: string[] },
): Promise<ProvisionResult> {
  const updateNames = new Set(options?.updateExisting ?? []);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const templates: Array<{ id: string; name: string }> = [];

  for (const template of DEFAULT_CONTRACT_TEMPLATES) {
    const existing = await client.contractTemplate.findFirst({
      where: { companyId, name: template.name },
    });

    if (existing && updateNames.has(template.name)) {
      await client.contractTemplateField.deleteMany({ where: { templateId: existing.id } });
      const row = await client.contractTemplate.update({
        where: { id: existing.id },
        data: {
          type: template.type,
          description: template.description,
          bodyHtml: template.bodyHtml,
          fields: { create: template.fields },
        },
      });
      templates.push({ id: row.id, name: row.name });
      updated += 1;
      continue;
    }

    if (existing) {
      templates.push({ id: existing.id, name: existing.name });
      skipped += 1;
      continue;
    }

    const row = await client.contractTemplate.create({
      data: {
        companyId,
        name: template.name,
        type: template.type,
        description: template.description,
        bodyHtml: template.bodyHtml,
        fields: { create: template.fields },
      },
    });
    templates.push({ id: row.id, name: row.name });
    created += 1;
  }

  return { created, updated, skipped, templates };
}
