import { prisma } from '../../core/database/prisma.js';
import type { Prisma } from '@prisma/client';

export class TemplatesRepository {
  findActiveByCompany(companyId: string) {
    return prisma.contractTemplate.findMany({
      where: { companyId, active: true },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findByNameForCompany(companyId: string, name: string) {
    return prisma.contractTemplate.findFirst({
      where: { companyId, name },
    });
  }

  findByIdForCompany(id: string, companyId: string) {
    return prisma.contractTemplate.findFirst({
      where: { id, companyId },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { versions: true } },
      },
    });
  }

  create(data: Prisma.ContractTemplateCreateInput) {
    return prisma.contractTemplate.create({
      data,
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  countVersions(templateId: string) {
    return prisma.contractTemplateVersion.count({ where: { templateId } });
  }

  createVersion(data: Prisma.ContractTemplateVersionCreateInput) {
    return prisma.contractTemplateVersion.create({ data });
  }

  findVersions(templateId: string) {
    return prisma.contractTemplateVersion.findMany({
      where: { templateId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findVersionById(templateId: string, versionId: string) {
    return prisma.contractTemplateVersion.findFirst({
      where: { id: versionId, templateId },
    });
  }

  updateTemplate(
    templateId: string,
    data: Prisma.ContractTemplateUpdateInput,
    fields?: Array<{
      key: string;
      label: string;
      fieldType: string;
      required: boolean;
      sortOrder: number;
    }>,
  ) {
    return prisma.$transaction(async (tx) => {
      if (fields) {
        await tx.contractTemplateField.deleteMany({ where: { templateId } });
      }
      return tx.contractTemplate.update({
        where: { id: templateId },
        data: {
          ...data,
          ...(fields
            ? {
                fields: {
                  create: fields,
                },
              }
            : {}),
        },
        include: {
          fields: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { versions: true } },
        },
      });
    });
  }
}
